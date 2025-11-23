package models

import (
	"time"

	"gorm.io/gorm"
)

// User model removed - all user data is now fetched from Logto

type Tag struct {
	ID   uint   `gorm:"primaryKey" json:"ID"`
	Name string `gorm:"unique;not null" json:"Name"`
}

type Post struct {
	ID             uint           `gorm:"primaryKey" json:"ID"`
	Title          string         `gorm:"not null" json:"Title"`
	Content        string         `gorm:"type:text;not null" json:"Content"`
	AuthorID       string         `gorm:"not null;index" json:"AuthorID"` // Logto user ID (sub claim)
	AuthorUsername string         `gorm:"not null" json:"AuthorUsername"` // Denormalized: snapshot at creation
	AuthorAvatar   string         `json:"AuthorAvatar"`                   // Denormalized: snapshot at creation
	Tags           []Tag          `gorm:"many2many:post_tags;" json:"Tags"`
	IsSecret       bool           `gorm:"default:false" json:"IsSecret"`
	CreatedAt      time.Time      `json:"CreatedAt"`
	UpdatedAt      time.Time      `json:"UpdatedAt"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`
}

type Comment struct {
	ID             uint           `gorm:"primaryKey" json:"ID"`
	Content        string         `gorm:"type:text;not null" json:"Content"`
	PostID         uint           `gorm:"not null;index" json:"PostID"`
	Post           Post           `gorm:"foreignKey:PostID" json:"-"`
	AuthorID       string         `gorm:"not null;index" json:"AuthorID"` // Logto user ID (sub claim)
	AuthorUsername string         `gorm:"not null" json:"AuthorUsername"` // Denormalized: snapshot at creation
	AuthorAvatar   string         `json:"AuthorAvatar"`                   // Denormalized: snapshot at creation
	ParentID       *uint          `gorm:"index" json:"ParentID"`          // null = top-level comment
	Parent         *Comment       `gorm:"foreignKey:ParentID" json:"-"`
	Replies        []Comment      `gorm:"foreignKey:ParentID" json:"Replies,omitempty"`
	CreatedAt      time.Time      `json:"CreatedAt"`
	UpdatedAt      time.Time      `json:"UpdatedAt"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`
}
