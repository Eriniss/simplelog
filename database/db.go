package database

import (
	"fmt"
	"log"
	"os"
	"simplelog/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func Init() {
	var err error

	// Get database configuration from environment
	host := os.Getenv("DB_HOST")
	if host == "" {
		host = "localhost"
	}

	port := os.Getenv("DB_PORT")
	if port == "" {
		port = "5432"
	}

	user := os.Getenv("DB_USER")
	if user == "" {
		user = "simplelog"
	}

	password := os.Getenv("DB_PASSWORD")
	if password == "" {
		password = "simplelog_password"
	}

	dbname := os.Getenv("DB_NAME")
	if dbname == "" {
		dbname = "simplelog"
	}

	// Build DSN (Data Source Name)
	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		host, port, user, password, dbname)

	// Connect to PostgreSQL
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Auto migrate (User table removed - all user data from Logto)
	err = DB.AutoMigrate(&models.Post{}, &models.Comment{})
	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	log.Println("Database initialized successfully")
}
