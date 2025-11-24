package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"
)

// LogtoManagementToken caches the management API token
type LogtoManagementToken struct {
	AccessToken string `json:"access_token"`
	ExpiresIn   int    `json:"expires_in"`
	TokenType   string `json:"token_type"`
	Scope       string `json:"scope"`
	ExpiresAt   time.Time
}

var (
	mgmtToken      *LogtoManagementToken
	mgmtTokenMutex sync.Mutex
)

// GetManagementToken retrieves a valid management API token, refreshing if necessary
func GetManagementToken() (string, error) {
	mgmtTokenMutex.Lock()
	defer mgmtTokenMutex.Unlock()

	// Return cached token if valid (with 5 minute buffer)
	if mgmtToken != nil && time.Now().Add(5*time.Minute).Before(mgmtToken.ExpiresAt) {
		return mgmtToken.AccessToken, nil
	}

	endpoint := os.Getenv("LOGTO_ENDPOINT")
	// Use dedicated M2M credentials if available, otherwise fallback to standard App ID (which likely fails)
	appID := os.Getenv("LOGTO_MANAGEMENT_APP_ID")
	if appID == "" {
		appID = os.Getenv("LOGTO_APP_ID")
	}
	appSecret := os.Getenv("LOGTO_MANAGEMENT_APP_SECRET")
	if appSecret == "" {
		appSecret = os.Getenv("LOGTO_APP_SECRET")
	}

	if len(appID) > 5 {
		log.Printf("GetManagementToken using App ID: %s...", appID[:5])
	} else {
		log.Printf("GetManagementToken using App ID: %s", appID)
	}

	// The resource for Management API is usually the Logto API endpoint itself
	// Default Logto Management API resource is usually https://[your-domain]/api
	// We can try to infer it or just use the default audience pattern if not specified.
	// For Logto Cloud/Self-hosted, the management API resource is often just `https://[tenant].logto.app/api` or similar.
	// However, typically for M2M to Management API, we need to request `https://default.logto.app/api` or similar.
	// Let's try to construct it from the endpoint.

	// Assuming endpoint ends with slash, e.g., https://login.polipixel.link/
	resource := strings.TrimSuffix(endpoint, "/") + "/api"

	data := url.Values{}
	data.Set("grant_type", "client_credentials")
	data.Set("resource", resource)
	data.Set("scope", "all")

	tokenURL := endpoint + "oidc/token"
	req, err := http.NewRequest("POST", tokenURL, strings.NewReader(data.Encode()))
	if err != nil {
		return "", err
	}

	req.SetBasicAuth(appID, appSecret)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("failed to get management token (status %d): %s", resp.StatusCode, string(body))
	}

	var tokenResp LogtoManagementToken
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return "", err
	}

	tokenResp.ExpiresAt = time.Now().Add(time.Duration(tokenResp.ExpiresIn) * time.Second)
	mgmtToken = &tokenResp

	return tokenResp.AccessToken, nil
}

// LogtoUser represents the user structure from Logto Management API
type LogtoUser struct {
	ID         string                 `json:"id"`
	Username   string                 `json:"username"`
	Name       string                 `json:"name"`
	Avatar     string                 `json:"avatar"`
	CustomData map[string]interface{} `json:"customData"`
}

// GetLogtoUser fetches user details from Logto Management API
func GetLogtoUser(userID string) (*LogtoUser, error) {
	token, err := GetManagementToken()
	if err != nil {
		return nil, err
	}

	endpoint := os.Getenv("LOGTO_ENDPOINT")
	userURL := fmt.Sprintf("%sapi/users/%s", endpoint, userID)

	req, err := http.NewRequest("GET", userURL, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+token)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to fetch user (status %d): %s", resp.StatusCode, string(body))
	}

	var user LogtoUser
	if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
		return nil, err
	}

	return &user, nil
}
