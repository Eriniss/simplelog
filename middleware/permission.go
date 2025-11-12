package middleware

import (
	"github.com/gofiber/fiber/v3"
)

// RequireAdmin checks if the current user is an admin
func RequireAdmin(c fiber.Ctx) error {
	claims, err := GetCurrentUserClaims(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	if GetUserRole(claims) != "admin" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Forbidden: Admin access required",
		})
	}

	return c.Next()
}
