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

// GetPosts returns all posts (author info fetched separately by frontend)
func GetPosts(c fiber.Ctx) error {
	var posts []models.Post
	result := database.DB.Order("created_at desc").Find(&posts)
	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch posts",
		})
	}

	return c.JSON(posts)
}

// GetPost returns a single post by ID (author info fetched separately by frontend)
func GetPost(c fiber.Ctx) error {
	id := c.Params("id")

	var post models.Post
	result := database.DB.First(&post, id)
	if result.Error != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Post not found",
		})
	}

	return c.JSON(post)
}

// CreatePost creates a new post
func CreatePost(c fiber.Ctx) error {
	claims, err := middleware.GetCurrentUserClaims(c)
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
		Title:          req.Title,
		Content:        req.Content,
		AuthorID:       claims.Sub,
		AuthorUsername: middleware.GetUsername(claims),
		AuthorAvatar:   claims.Picture,
	}

	if err := database.DB.Create(&post).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create post",
		})
	}

	// Cleanup unused images after creating post
	go CleanupUnusedImages()

	return c.Status(fiber.StatusCreated).JSON(post)
}

// UpdatePost updates an existing post
func UpdatePost(c fiber.Ctx) error {
	claims, err := middleware.GetCurrentUserClaims(c)
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
	userRole := middleware.GetUserRole(claims)
	if userRole != "admin" && post.AuthorID != claims.Sub {
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

	// Cleanup unused images after updating post
	go CleanupUnusedImages()

	return c.JSON(post)
}

// DeletePost deletes a post
func DeletePost(c fiber.Ctx) error {
	claims, err := middleware.GetCurrentUserClaims(c)
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
	userRole := middleware.GetUserRole(claims)
	if userRole != "admin" && post.AuthorID != claims.Sub {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Forbidden: You can only delete your own posts",
		})
	}

	if err := database.DB.Delete(&post).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete post",
		})
	}

	// Cleanup unused images after deleting post
	go CleanupUnusedImages()

	return c.JSON(fiber.Map{
		"message": "Post deleted successfully",
	})
}

// GetCurrentUserInfo returns the current user information from Logto
func GetCurrentUserInfo(c fiber.Ctx) error {
	claims, err := middleware.GetCurrentUserClaims(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	// Extract intro from custom_data
	intro := ""
	if claims.CustomData != nil {
		if customIntro, ok := claims.CustomData["intro"].(string); ok {
			intro = customIntro
		}
	}

	return c.JSON(fiber.Map{
		"ID":       claims.Sub,
		"Email":    claims.Email,
		"Username": middleware.GetUsername(claims),
		"Avatar":   claims.Picture,
		"Intro":    intro,
		"Role":     middleware.GetUserRole(claims),
	})
}

// GetUserProfile returns public profile information by fetching from Logto
func GetUserProfile(c fiber.Ctx) error {
	userID := c.Params("id")
	if userID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "User ID is required",
		})
	}

	// Fetch user info from Logto Management API
	logtoUser, err := GetLogtoUser(userID)
	if err != nil {
		log.Printf("Error fetching user from Logto: %v", err)
		// Return detailed error for debugging
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": fmt.Sprintf("Failed to fetch user from Logto: %v", err),
		})
	}

	// Extract intro from custom_data
	intro := ""
	if logtoUser.CustomData != nil {
		if customIntro, ok := logtoUser.CustomData["intro"].(string); ok {
			intro = customIntro
		}
	}

	return c.JSON(fiber.Map{
		"ID":       logtoUser.ID,
		"Username": logtoUser.Username,
		"Avatar":   logtoUser.Avatar,
		"Intro":    intro,
		"Role":     "user", // Default role for public view
	})
}

type UpdateProfileRequest struct {
	Username *string `json:"username"`
	Avatar   *string `json:"avatar"`
	Intro    *string `json:"intro"`
}

// UpdateProfile updates user profile via Logto Account API
func UpdateProfile(c fiber.Ctx) error {
	claims, err := middleware.GetCurrentUserClaims(c)
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

	log.Printf("Updating profile for user %s with payload: %s", claims.Sub, string(payloadBytes))

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

	// No local DB update needed - Logto is the source of truth
	// Return success - client should re-fetch user info if needed
	return c.JSON(fiber.Map{
		"message": "Profile updated successfully",
	})
}
