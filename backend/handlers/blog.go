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

	// Get query params
	search := c.Query("search")
	searchType := c.Query("type") // "title" or "tag"

	// Get current user ID (if logged in)
	var userID string
	if claims, ok := c.Locals("userClaims").(*middleware.LogtoClaims); ok {
		userID = claims.Sub
	}

	// Pagination
	limit := 10
	if l := c.Query("limit"); l != "" {
		if l == "all" {
			limit = -1
		} else {
			if val, err := strconv.Atoi(l); err == nil && val > 0 {
				limit = val
			}
		}
	}
	offset := 0
	if o := c.Query("offset"); o != "" {
		if val, err := strconv.Atoi(o); err == nil && val >= 0 {
			offset = val
		}
	}

	// Build base query
	query := database.DB.Model(&models.Post{})

	// Search Logic
	if search != "" {
		if searchType == "tag" {
			// Join with tags table
			query = query.Joins("JOIN post_tags ON post_tags.post_id = posts.id").
				Joins("JOIN tags ON tags.id = post_tags.tag_id").
				Where("tags.name LIKE ?", "%"+search+"%")
		} else {
			// Default to title search
			query = query.Where("title LIKE ?", "%"+search+"%")
		}
	}

	// Secret Logic: Show public posts OR (secret posts AND author is me)
	// (is_secret = false) OR (is_secret = true AND author_id = userID)
	query = query.Where("is_secret = ? OR (is_secret = ? AND author_id = ?)", false, true, userID)

	// Count total posts (before pagination)
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to count posts",
		})
	}

	// Apply Pagination
	if limit > 0 {
		query = query.Limit(limit).Offset(offset)
	}

	// Fetch Posts
	if err := query.Preload("Tags").Order("created_at desc").Find(&posts).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch posts",
		})
	}

	return c.JSON(fiber.Map{
		"posts": posts,
		"total": total,
	})
}

// GetPost returns a single post by ID (author info fetched separately by frontend)
func GetPost(c fiber.Ctx) error {
	id := c.Params("id")
	var post models.Post

	if err := database.DB.Preload("Tags").First(&post, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Post not found",
		})
	}

	// Secret Check
	if post.IsSecret {
		var userID string
		if claims, ok := c.Locals("userClaims").(*middleware.LogtoClaims); ok {
			userID = claims.Sub
		}
		if post.AuthorID != userID {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "This is a secret post",
			})
		}
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

	// Parse request body
	type CreatePostRequest struct {
		Title    string   `json:"title"`
		Content  string   `json:"content"`
		Tags     []string `json:"tags"`
		IsSecret bool     `json:"isSecret"`
	}

	var req CreatePostRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if req.Title == "" || req.Content == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Title and content are required",
		})
	}

	userID := claims.Sub

	// Use claims directly for user info (avoiding M2M call which might fail if not configured)
	authorUsername := middleware.GetUsername(claims)
	authorAvatar := claims.Picture

	// Handle Tags
	var tags []models.Tag
	for _, tagName := range req.Tags {
		var tag models.Tag
		// FirstOrCreate to avoid duplicates
		if err := database.DB.FirstOrCreate(&tag, models.Tag{Name: tagName}).Error; err != nil {
			log.Printf("Failed to create/find tag: %v", err)
			continue
		}
		tags = append(tags, tag)
	}

	post := models.Post{
		Title:          req.Title,
		Content:        req.Content,
		AuthorID:       userID,
		AuthorUsername: authorUsername,
		AuthorAvatar:   authorAvatar,
		Tags:           tags,
		IsSecret:       req.IsSecret,
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

	// Parse request body
	type UpdatePostRequest struct {
		Title    string   `json:"title"`
		Content  string   `json:"content"`
		Tags     []string `json:"tags"`
		IsSecret bool     `json:"isSecret"`
	}

	var req UpdatePostRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Handle Tags
	var tags []models.Tag
	for _, tagName := range req.Tags {
		var tag models.Tag
		if err := database.DB.FirstOrCreate(&tag, models.Tag{Name: tagName}).Error; err != nil {
			log.Printf("Failed to create/find tag: %v", err)
			continue
		}
		tags = append(tags, tag)
	}

	// Update fields
	post.Title = req.Title
	post.Content = req.Content
	post.IsSecret = req.IsSecret

	// Replace tags
	if err := database.DB.Model(&post).Association("Tags").Replace(tags); err != nil {
		log.Printf("Failed to update tags: %v", err)
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

// GetUserTags returns all tags used by a specific user
func GetUserTags(c fiber.Ctx) error {
	userID := c.Params("id")
	if userID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "User ID is required",
		})
	}

	type TagInfo struct {
		Name  string `json:"name"`
		Count int64  `json:"count"`
	}

	var tags []TagInfo

	// Get all tags used by this user with count
	err := database.DB.Table("tags").
		Select("tags.name, COUNT(post_tags.tag_id) as count").
		Joins("INNER JOIN post_tags ON tags.id = post_tags.tag_id").
		Joins("INNER JOIN posts ON post_tags.post_id = posts.id AND posts.deleted_at IS NULL").
		Where("posts.author_id = ?", userID).
		Group("tags.id, tags.name").
		Order("count DESC, tags.name ASC").
		Scan(&tags).Error

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get user tags",
		})
	}

	return c.JSON(tags)
}
