package database

import (
	"fmt"
	"log"
	"os"
	"simplelog/models"

	"github.com/glebarez/sqlite"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func Init() {
	var err error

	// Use PostgreSQL if DB_HOST is set (production), otherwise use SQLite (local dev)
	dbHost := os.Getenv("DB_HOST")
	if dbHost != "" {
		// PostgreSQL configuration for production
		dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable",
			dbHost,
			os.Getenv("DB_USER"),
			os.Getenv("DB_PASSWORD"),
			os.Getenv("DB_NAME"),
			os.Getenv("DB_PORT"),
		)
		DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
		if err != nil {
			log.Fatal("Failed to connect to PostgreSQL:", err)
		}
		log.Println("Using PostgreSQL database")
	} else {
		// SQLite configuration for local development
		DB, err = gorm.Open(sqlite.Open("blog.db"), &gorm.Config{})
		if err != nil {
			log.Fatal("Failed to connect to SQLite:", err)
		}
		log.Println("Using SQLite database")
	}

	// Auto migrate
	err = DB.AutoMigrate(&models.Post{}, &models.Comment{}, &models.Tag{}, &models.Template{})
	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	log.Println("Database initialized successfully")
}
