package handlers

import (
	"simplelog/database"
	"simplelog/middleware"
	"simplelog/models"
	"strconv"

	"github.com/gofiber/fiber/v3"
)

type CreateCommentRequest struct {
	Content  string `json:"content"`
	ParentID *uint  `json:"parent_id"`
}

type UpdateCommentRequest struct {
	Content string `json:"content"`
}

// GetComments returns all comments for a post in hierarchical structure (author info fetched separately by frontend)
func GetComments(c fiber.Ctx) error {
	postID := c.Params("id")

	var comments []models.Comment
	// Get all top-level comments (ParentID is null)
	result := database.DB.
		Preload("Replies.Replies"). // Support 2 levels of nesting
		Where("post_id = ? AND parent_id IS NULL", postID).
		Order("created_at desc").
		Find(&comments)

	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch comments",
		})
	}

	return c.JSON(comments)
}

// CreateComment creates a new comment or reply
func CreateComment(c fiber.Ctx) error {
	claims, err := middleware.GetCurrentUserClaims(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	postID := c.Params("id")
	postIDUint, err := strconv.ParseUint(postID, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid post ID",
		})
	}

	// Verify post exists
	var post models.Post
	if err := database.DB.First(&post, postIDUint).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Post not found",
		})
	}

	var req CreateCommentRequest
	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if req.Content == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Content is required",
		})
	}

	// If replying to a comment, verify parent exists
	if req.ParentID != nil {
		var parent models.Comment
		if err := database.DB.First(&parent, *req.ParentID).Error; err != nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Parent comment not found",
			})
		}
		// Verify parent belongs to same post
		if parent.PostID != uint(postIDUint) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Parent comment does not belong to this post",
			})
		}
	}

	comment := models.Comment{
		Content:        req.Content,
		PostID:         uint(postIDUint),
		AuthorID:       claims.Sub,
		AuthorUsername: middleware.GetUsername(claims),
		AuthorAvatar:   claims.Picture,
		ParentID:       req.ParentID,
	}

	if err := database.DB.Create(&comment).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create comment",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(comment)
}

// UpdateComment updates an existing comment
func UpdateComment(c fiber.Ctx) error {
	claims, err := middleware.GetCurrentUserClaims(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	commentID := c.Params("id")
	commentIDUint, err := strconv.ParseUint(commentID, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid comment ID",
		})
	}

	var comment models.Comment
	result := database.DB.First(&comment, commentIDUint)
	if result.Error != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Comment not found",
		})
	}

	// Check permission: only admin or comment author can update
	userRole := middleware.GetUserRole(claims)
	if userRole != "admin" && comment.AuthorID != claims.Sub {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Forbidden: You can only update your own comments",
		})
	}

	var req UpdateCommentRequest
	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if req.Content != "" {
		comment.Content = req.Content
	}

	if err := database.DB.Save(&comment).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update comment",
		})
	}

	return c.JSON(comment)
}

// DeleteComment deletes a comment
func DeleteComment(c fiber.Ctx) error {
	claims, err := middleware.GetCurrentUserClaims(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	commentID := c.Params("id")
	commentIDUint, err := strconv.ParseUint(commentID, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid comment ID",
		})
	}

	var comment models.Comment
	result := database.DB.First(&comment, commentIDUint)
	if result.Error != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Comment not found",
		})
	}

	// Check permission: only admin or comment author can delete
	userRole := middleware.GetUserRole(claims)
	if userRole != "admin" && comment.AuthorID != claims.Sub {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Forbidden: You can only delete your own comments",
		})
	}

	if err := database.DB.Delete(&comment).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete comment",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Comment deleted successfully",
	})
}
