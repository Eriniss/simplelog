package main

import (
	"log"
	"os"
	"simplelog/database"
	"simplelog/handlers"
	"simplelog/middleware"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/cors"
	"github.com/gofiber/fiber/v3/middleware/logger"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	// Initialize database
	database.Init()

	// Create Fiber app
	app := fiber.New(fiber.Config{
		ErrorHandler: func(c fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}
			return c.Status(code).JSON(fiber.Map{
				"error": err.Error(),
			})
		},
	})

	// Middleware
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:5173"},
		AllowCredentials: true,
	}))

	// Auth routes (no auth required)
	app.Get("/auth/login", handlers.HandleLogin)
	app.Get("/oidc/callback", handlers.HandleCallback)
	app.Get("/auth/logout", handlers.HandleLogout)

	// API routes (auth required)
	api := app.Group("/api")
	api.Use(middleware.RequireAuth)

	// User info
	api.Get("/me", handlers.GetCurrentUserInfo)
	api.Get("/users/:id", handlers.GetUserProfile)
	api.Patch("/profile", handlers.UpdateProfile)

	// Public read routes (authenticated users can read all posts)
	api.Get("/posts", handlers.GetPosts)
	api.Get("/posts/:id", handlers.GetPost)

	// Write routes (all authenticated users can create posts)
	api.Post("/posts", handlers.CreatePost)

	// Update/Delete routes (only owner or admin)
	api.Put("/posts/:id", handlers.UpdatePost)
	api.Delete("/posts/:id", handlers.DeletePost)

	// Comment routes
	api.Get("/posts/:id/comments", handlers.GetComments)
	api.Post("/posts/:id/comments", handlers.CreateComment)
	api.Put("/comments/:id", handlers.UpdateComment)
	api.Delete("/comments/:id", handlers.DeleteComment)

	// Image upload routes
	api.Post("/upload/image", handlers.UploadImage)
	api.Delete("/upload/image/:filename", handlers.DeleteImage)

	// Serve uploaded images as static files
	app.Get("/uploads/:filename", func(c fiber.Ctx) error {
		filename := c.Params("filename")
		return c.SendFile("./public/uploads/" + filename)
	})

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	log.Printf("Server starting on http://localhost:%s", port)
	log.Fatal(app.Listen(":" + port))
}
