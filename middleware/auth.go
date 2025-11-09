package middleware

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"simplelog/database"
	"simplelog/models"
	"time"

	"github.com/gofiber/fiber/v3"
)

type LogtoClaims struct {
	Sub        string                 `json:"sub"`
	Email      string                 `json:"email"`
	Name       string                 `json:"name"`
	Picture    string                 `json:"picture"`
	Roles      []string               `json:"roles"`
	CustomData map[string]interface{} `json:"custom_data"`
}

// RequireAuth checks if user is authenticated
func RequireAuth(c fiber.Ctx) error {
	sessionToken := c.Cookies("session_token")
	if sessionToken == "" {
		log.Println("No session token found in cookie")
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	log.Printf("Found session token: %s", sessionToken[:10]+"...")

	// Verify token with Logto
	userInfo, err := verifyToken(sessionToken)
	if err != nil {
		log.Printf("Token verification failed: %v", err)
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid token",
		})
	}

	log.Printf("Token verified successfully for user: %s (roles: %v, custom_data: %v)", userInfo.Email, userInfo.Roles, userInfo.CustomData)

	// Determine user role from Logto roles or custom_data
	role := "user" // default

	// Method 1: Check Roles array
	for _, r := range userInfo.Roles {
		if r == "admin" {
			role = "admin"
			break
		}
	}

	// Method 2: Check custom_data if roles is empty
	if role == "user" && userInfo.CustomData != nil {
		if customRole, ok := userInfo.CustomData["role"].(string); ok {
			if customRole == "admin" {
				role = "admin"
			}
		}
	}

	// Get intro from custom_data and avatar from picture field
	intro := ""
	avatar := userInfo.Picture // Avatar comes from standard OIDC 'picture' field

	log.Printf("Picture field: %s", avatar)

	if userInfo.CustomData != nil {
		log.Printf("CustomData contents: %+v", userInfo.CustomData)
		if customIntro, ok := userInfo.CustomData["intro"].(string); ok {
			intro = customIntro
			log.Printf("Found intro: %s", intro)
		}
	}

	// Get or create user
	var user models.User
	result := database.DB.Where("id = ?", userInfo.Sub).First(&user)
	if result.Error != nil {
		// Create new user
		log.Printf("Creating new user: %s with role: %s", userInfo.Email, role)
		user = models.User{
			ID:     userInfo.Sub,
			Email:  userInfo.Email,
			Name:   userInfo.Name,
			Intro:  intro,
			Avatar: avatar,
			Role:   role,
		}
		database.DB.Create(&user)
	} else {
		// Update existing user's role, intro, and avatar if changed
		updated := false
		if user.Role != role {
			log.Printf("Updating user role from %s to %s", user.Role, role)
			user.Role = role
			updated = true
		}
		if user.Intro != intro {
			log.Printf("Updating user intro")
			user.Intro = intro
			updated = true
		}
		if user.Avatar != avatar {
			log.Printf("Updating user avatar")
			user.Avatar = avatar
			updated = true
		}
		if updated {
			database.DB.Save(&user)
		}
	}

	// Store user in context
	c.Locals("user", user)
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

// GetCurrentUser retrieves the current user from context
func GetCurrentUser(c fiber.Ctx) (*models.User, error) {
	user, ok := c.Locals("user").(models.User)
	if !ok {
		return nil, fmt.Errorf("user not found in context")
	}
	return &user, nil
}
