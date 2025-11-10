package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"simplelog/database"
	"simplelog/middleware"
	"simplelog/models"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v3"
)

type CreatePostRequest struct {
	Title   string `json:"title"`
	Content string `json:"content"`
}

type UpdatePostRequest struct {
	Title   string `json:"title"`
	Content string `json:"content"`
}

// GetPosts returns all posts
func GetPosts(c fiber.Ctx) error {
	var posts []models.Post
	result := database.DB.Preload("Author").Order("created_at desc").Find(&posts)
	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch posts",
		})
	}

	return c.JSON(posts)
}

// GetPost returns a single post by ID
func GetPost(c fiber.Ctx) error {
	id := c.Params("id")

	var post models.Post
	result := database.DB.Preload("Author").First(&post, id)
	if result.Error != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Post not found",
		})
	}

	return c.JSON(post)
}

// CreatePost creates a new post
func CreatePost(c fiber.Ctx) error {
	user, err := middleware.GetCurrentUser(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	var req CreatePostRequest
	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if req.Title == "" || req.Content == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Title and content are required",
		})
	}

	post := models.Post{
		Title:    req.Title,
		Content:  req.Content,
		AuthorID: user.ID,
	}

	if err := database.DB.Create(&post).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create post",
		})
	}

	// Reload with author
	database.DB.Preload("Author").First(&post, post.ID)

	return c.Status(fiber.StatusCreated).JSON(post)
}

// UpdatePost updates an existing post
func UpdatePost(c fiber.Ctx) error {
	user, err := middleware.GetCurrentUser(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	id := c.Params("id")
	postID, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid post ID",
		})
	}

	var post models.Post
	result := database.DB.First(&post, postID)
	if result.Error != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Post not found",
		})
	}

	// Check permission: only admin or post author can update
	if user.Role != "admin" && post.AuthorID != user.ID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Forbidden: You can only update your own posts",
		})
	}

	var req UpdatePostRequest
	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if req.Title != "" {
		post.Title = req.Title
	}
	if req.Content != "" {
		post.Content = req.Content
	}

	if err := database.DB.Save(&post).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update post",
		})
	}

	// Reload with author
	database.DB.Preload("Author").First(&post, post.ID)

	return c.JSON(post)
}

// DeletePost deletes a post
func DeletePost(c fiber.Ctx) error {
	user, err := middleware.GetCurrentUser(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	id := c.Params("id")
	postID, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid post ID",
		})
	}

	var post models.Post
	result := database.DB.First(&post, postID)
	if result.Error != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Post not found",
		})
	}

	// Check permission: only admin or post author can delete
	if user.Role != "admin" && post.AuthorID != user.ID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Forbidden: You can only delete your own posts",
		})
	}

	if err := database.DB.Delete(&post).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete post",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Post deleted successfully",
	})
}

// GetCurrentUserInfo returns the current user information
func GetCurrentUserInfo(c fiber.Ctx) error {
	user, err := middleware.GetCurrentUser(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	return c.JSON(user)
}

type UpdateProfileRequest struct {
	Username *string `json:"username"`
	Avatar   *string `json:"avatar"`
	Intro    *string `json:"intro"`
}

// UpdateProfile updates user profile via Logto Account API
func UpdateProfile(c fiber.Ctx) error {
	user, err := middleware.GetCurrentUser(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	var req UpdateProfileRequest
	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Get access token from cookie
	sessionToken := c.Cookies("session_token")
	if sessionToken == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "No session token",
		})
	}

	// Prepare update payload for Logto Account API
	payload := make(map[string]interface{})

	if req.Username != nil {
		payload["username"] = *req.Username
	}
	if req.Avatar != nil {
		payload["avatar"] = *req.Avatar
	}
	if req.Intro != nil {
		if payload["customData"] == nil {
			payload["customData"] = make(map[string]interface{})
		}
		payload["customData"].(map[string]interface{})["intro"] = *req.Intro
	}

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to prepare update",
		})
	}

	log.Printf("Updating profile for user %s with payload: %s", user.ID, string(payloadBytes))

	// Call Logto Account API
	endpoint := os.Getenv("LOGTO_ENDPOINT")
	accountURL := endpoint + "api/my-account"

	httpReq, err := http.NewRequest("PATCH", accountURL, bytes.NewBuffer(payloadBytes))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create request",
		})
	}

	httpReq.Header.Set("Authorization", "Bearer "+sessionToken)
	httpReq.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		log.Printf("Error calling Logto Account API: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update profile",
		})
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	log.Printf("Logto Account API response status: %d, body: %s", resp.StatusCode, string(body))

	if resp.StatusCode != http.StatusOK {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": fmt.Sprintf("Logto API error: %s", string(body)),
		})
	}

	// Update local database
	if req.Username != nil {
		user.Username = *req.Username
	}
	if req.Avatar != nil {
		user.Avatar = *req.Avatar
	}
	if req.Intro != nil {
		user.Intro = *req.Intro
	}

	if err := database.DB.Save(&user).Error; err != nil {
		log.Printf("Failed to update local user: %v", err)
		// Don't fail the request, Logto is source of truth
	}

	return c.JSON(user)
}
