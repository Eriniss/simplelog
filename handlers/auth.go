package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"time"

	"github.com/gofiber/fiber/v3"
)

type TokenResponse struct {
	AccessToken  string `json:"access_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int    `json:"expires_in"`
	RefreshToken string `json:"refresh_token"`
	IDToken      string `json:"id_token"`
}

// HandleLogin redirects to Logto login page
func HandleLogin(c fiber.Ctx) error {
	endpoint := os.Getenv("LOGTO_ENDPOINT")
	appID := os.Getenv("LOGTO_APP_ID")
	redirectURI := os.Getenv("LOGTO_REDIRECT_URI")

	authURL := fmt.Sprintf("%soidc/auth?client_id=%s&redirect_uri=%s&response_type=code&scope=openid+profile+email+roles+custom_data",
		endpoint, appID, url.QueryEscape(redirectURI))

	return c.Redirect().To(authURL)
}

// HandleCallback handles the OIDC callback
func HandleCallback(c fiber.Ctx) error {
	code := c.Query("code")
	if code == "" {
		log.Println("Error: No authorization code provided")
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "No authorization code provided",
		})
	}

	log.Printf("Received authorization code: %s", code[:10]+"...")

	// Exchange code for token
	token, err := exchangeCodeForToken(code)
	if err != nil {
		log.Printf("Error exchanging code for token: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to exchange code for token: " + err.Error(),
		})
	}

	log.Printf("Successfully got access token: %s", token.AccessToken[:10]+"...")

	// Set session cookie
	c.Cookie(&fiber.Cookie{
		Name:     "session_token",
		Value:    token.AccessToken,
		Expires:  time.Now().Add(time.Duration(token.ExpiresIn) * time.Second),
		HTTPOnly: true,
		Secure:   false, // Set to true in production with HTTPS
		SameSite: "Lax",
	})

	log.Println("Cookie set, redirecting to /")

	return c.Redirect().To("/")
}

// HandleLogout logs out the user
func HandleLogout(c fiber.Ctx) error {
	// Clear session cookie
	c.Cookie(&fiber.Cookie{
		Name:     "session_token",
		Value:    "",
		Expires:  time.Now().Add(-1 * time.Hour),
		HTTPOnly: true,
	})

	// Redirect to Logto logout endpoint to clear Logto session
	endpoint := os.Getenv("LOGTO_ENDPOINT")
	appID := os.Getenv("LOGTO_APP_ID")
	postLogoutURI := os.Getenv("LOGTO_POST_LOGOUT_REDIRECT_URI")

	logoutURL := fmt.Sprintf("%soidc/session/end?client_id=%s&post_logout_redirect_uri=%s",
		endpoint, appID, url.QueryEscape(postLogoutURI))

	return c.Redirect().To(logoutURL)
}

func exchangeCodeForToken(code string) (*TokenResponse, error) {
	endpoint := os.Getenv("LOGTO_ENDPOINT")
	appID := os.Getenv("LOGTO_APP_ID")
	appSecret := os.Getenv("LOGTO_APP_SECRET")
	redirectURI := os.Getenv("LOGTO_REDIRECT_URI")

	data := url.Values{}
	data.Set("grant_type", "authorization_code")
	data.Set("client_id", appID)
	data.Set("client_secret", appSecret)
	data.Set("code", code)
	data.Set("redirect_uri", redirectURI)

	tokenURL := endpoint + "oidc/token"
	req, err := http.NewRequest("POST", tokenURL, bytes.NewBufferString(data.Encode()))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to exchange token (status %d): %s", resp.StatusCode, string(body))
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var tokenResp TokenResponse
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return nil, err
	}

	return &tokenResp, nil
}
