package handlers

import (
	"crypto/md5"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
)

const (
	maxFileSize   = 10 * 1024 * 1024 // 10MB
	uploadDir     = "./public/uploads"
	allowedTypes  = "image/jpeg,image/jpg,image/png,image/gif,image/webp"
)

// UploadImage handles image file uploads
func UploadImage(c fiber.Ctx) error {
	// Get the file from the request
	file, err := c.FormFile("image")
	if err != nil {
		log.Printf("Error getting file: %v", err)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "No file uploaded",
		})
	}

	// Check file size
	if file.Size > maxFileSize {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": fmt.Sprintf("File too large. Maximum size is %d MB", maxFileSize/(1024*1024)),
		})
	}

	// Check file type
	contentType := file.Header.Get("Content-Type")
	if !strings.Contains(allowedTypes, contentType) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid file type. Only images are allowed (JPEG, PNG, GIF, WebP)",
		})
	}

	// Create uploads directory if it doesn't exist
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		log.Printf("Error creating upload directory: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create upload directory",
		})
	}

	// Generate unique filename
	ext := filepath.Ext(file.Filename)
	timestamp := time.Now().UnixNano()
	hash := md5.New()
	io.WriteString(hash, fmt.Sprintf("%s-%d", file.Filename, timestamp))
	filename := fmt.Sprintf("%x%s", hash.Sum(nil), ext)

	// Save the file
	filepath := filepath.Join(uploadDir, filename)
	if err := c.SaveFile(file, filepath); err != nil {
		log.Printf("Error saving file: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to save file",
		})
	}

	// Return the URL
	imageURL := fmt.Sprintf("/uploads/%s", filename)
	log.Printf("Image uploaded successfully: %s (original: %s, size: %d bytes)", imageURL, file.Filename, file.Size)

	return c.JSON(fiber.Map{
		"url":      imageURL,
		"filename": file.Filename,
		"size":     file.Size,
	})
}

// DeleteImage handles image deletion (optional, for cleanup)
func DeleteImage(c fiber.Ctx) error {
	filename := c.Params("filename")

	// Security: prevent directory traversal
	if strings.Contains(filename, "..") || strings.Contains(filename, "/") {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid filename",
		})
	}

	filepath := filepath.Join(uploadDir, filename)

	// Check if file exists
	if _, err := os.Stat(filepath); os.IsNotExist(err) {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "File not found",
		})
	}

	// Delete the file
	if err := os.Remove(filepath); err != nil {
		log.Printf("Error deleting file: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete file",
		})
	}

	log.Printf("Image deleted: %s", filename)
	return c.JSON(fiber.Map{
		"message": "File deleted successfully",
	})
}
