package handlers

import (
	"simplelog/database"
	"simplelog/middleware"
	"simplelog/models"
	"strconv"

	"github.com/gofiber/fiber/v3"
)

type CreateTemplateRequest struct {
	Name     string `json:"name"`
	Content  string `json:"content"`
	IsPublic bool   `json:"isPublic"`
}

type UpdateTemplateRequest struct {
	Name     string `json:"name"`
	Content  string `json:"content"`
	IsPublic bool   `json:"isPublic"`
}

// GetTemplates returns user's templates + public templates
func GetTemplates(c fiber.Ctx) error {
	claims, err := middleware.GetCurrentUserClaims(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var templates []models.Template

	// Query: User's own templates OR public templates
	query := database.DB.Where("author_id = ? OR is_public = ?", claims.Sub, true)

	if err := query.Order("updated_at desc").Find(&templates).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch templates"})
	}

	return c.JSON(templates)
}

// GetTemplate returns a single template by ID
func GetTemplate(c fiber.Ctx) error {
	claims, err := middleware.GetCurrentUserClaims(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	idStr := c.Params("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid ID"})
	}

	var template models.Template
	if err := database.DB.First(&template, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Template not found"})
	}

	// Check permission: owner or public template
	if template.AuthorID != claims.Sub && !template.IsPublic {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}

	return c.JSON(template)
}

// CreateTemplate creates a new template
func CreateTemplate(c fiber.Ctx) error {
	claims, err := middleware.GetCurrentUserClaims(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req CreateTemplateRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if req.Name == "" || req.Content == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Name and content are required"})
	}

	// Only admins can create public templates
	isPublic := req.IsPublic
	userRole := middleware.GetUserRole(claims)
	if isPublic && userRole != "admin" {
		isPublic = false
	}

	template := models.Template{
		Name:     req.Name,
		Content:  req.Content,
		AuthorID: claims.Sub,
		IsPublic: isPublic,
	}

	if err := database.DB.Create(&template).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create template"})
	}

	return c.Status(fiber.StatusCreated).JSON(template)
}

// UpdateTemplate updates an existing template
func UpdateTemplate(c fiber.Ctx) error {
	claims, err := middleware.GetCurrentUserClaims(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	idStr := c.Params("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid ID"})
	}

	var template models.Template
	if err := database.DB.First(&template, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Template not found"})
	}

	// Check permission: owner or admin
	userRole := middleware.GetUserRole(claims)
	if userRole != "admin" && template.AuthorID != claims.Sub {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}

	var req UpdateTemplateRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if req.Name == "" || req.Content == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Name and content are required"})
	}

	// Only admins can make templates public
	isPublic := req.IsPublic
	if isPublic && userRole != "admin" {
		isPublic = template.IsPublic // Keep existing value
	}

	template.Name = req.Name
	template.Content = req.Content
	template.IsPublic = isPublic

	if err := database.DB.Save(&template).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update template"})
	}

	return c.JSON(template)
}

// DeleteTemplate deletes a template
func DeleteTemplate(c fiber.Ctx) error {
	claims, err := middleware.GetCurrentUserClaims(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	idStr := c.Params("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid ID"})
	}

	var template models.Template
	if err := database.DB.First(&template, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Template not found"})
	}

	// Check permission: owner or admin
	userRole := middleware.GetUserRole(claims)
	if userRole != "admin" && template.AuthorID != claims.Sub {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}

	if err := database.DB.Delete(&template).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete template"})
	}

	return c.JSON(fiber.Map{"message": "Template deleted successfully"})
}
