package middleware

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
)

type LogtoClaims struct {
	Sub        string                 `json:"sub"`
	Email      string                 `json:"email"`
	Username   string                 `json:"username"`
	Picture    string                 `json:"picture"`
	Roles      []string               `json:"roles"`
	CustomData map[string]interface{} `json:"custom_data"`
}

// handleUnauthorized checks request type and responds accordingly
// - For API calls (JSON): return 401 JSON
// - For browser navigation (HTML): redirect to login
func handleUnauthorized(c fiber.Ctx) error {
	accept := c.Get("Accept")

	// Check if this is a browser navigation request (wants HTML)
	// Browser navigation typically has Accept: text/html
	if strings.Contains(accept, "text/html") {
		log.Println("Browser request detected, redirecting to /auth/login")
		return c.Redirect().To("/auth/login")
	}

	// For API calls (JSON), return 401 so frontend can handle redirect
	log.Println("API request detected, returning 401 JSON")
	return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
		"error": "Unauthorized",
	})
}

// RequireAuth checks if user is authenticated
func RequireAuth(c fiber.Ctx) error {
	sessionToken := c.Cookies("session_token")
	if sessionToken == "" {
		log.Println("No session token found in cookie")
		return handleUnauthorized(c)
	}

	log.Printf("Found session token: %s", sessionToken[:10]+"...")

	// Verify token with Logto
	userInfo, err := verifyToken(sessionToken)
	if err != nil {
		log.Printf("Token verification failed: %v", err)
		return handleUnauthorized(c)
	}

	log.Printf("Token verified successfully for user: %s (sub: %s)", userInfo.Email, userInfo.Sub)

	// Store Logto claims directly in context (no DB user creation)
	c.Locals("userClaims", userInfo)
	return c.Next()
}

func verifyToken(token string) (*LogtoClaims, error) {
	endpoint := os.Getenv("LOGTO_ENDPOINT")
	userInfoURL := endpoint + "oidc/me"

	log.Printf("Verifying token with URL: %s", userInfoURL)

	req, err := http.NewRequest("GET", userInfoURL, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+token)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("HTTP request failed: %v", err)
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		log.Printf("Userinfo endpoint returned status %d: %s", resp.StatusCode, string(body))
		return nil, fmt.Errorf("invalid token (status %d)", resp.StatusCode)
	}

	log.Printf("Userinfo response: %s", string(body))

	var claims LogtoClaims
	if err := json.Unmarshal(body, &claims); err != nil {
		log.Printf("Failed to unmarshal claims: %v", err)
		return nil, err
	}

	return &claims, nil
}

// GetCurrentUserClaims retrieves the current user's Logto claims from context
func GetCurrentUserClaims(c fiber.Ctx) (*LogtoClaims, error) {
	claims, ok := c.Locals("userClaims").(*LogtoClaims)
	if !ok {
		return nil, fmt.Errorf("user claims not found in context")
	}
	return claims, nil
}

// GetUserRole determines the user's role from Logto claims
func GetUserRole(claims *LogtoClaims) string {
	// Method 1: Check Roles array
	for _, r := range claims.Roles {
		if r == "admin" {
			return "admin"
		}
	}

	// Method 2: Check custom_data if roles is empty
	if claims.CustomData != nil {
		if customRole, ok := claims.CustomData["role"].(string); ok {
			if customRole == "admin" {
				return "admin"
			}
		}
	}

	return "user" // default
}

// GetUsername extracts username from Logto claims, falling back to email if not set
func GetUsername(claims *LogtoClaims) string {
	if claims.Username != "" {
		return claims.Username
	}

	// Extract username from email (part before @)
	if claims.Email != "" {
		for i, ch := range claims.Email {
			if ch == '@' {
				return claims.Email[:i]
			}
		}
		return claims.Email
	}

	return "익명" // anonymous fallback
}
