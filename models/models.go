package models

import (
	"time"

	"gorm.io/gorm"
)

type User struct {
	ID        string    `gorm:"primaryKey" json:"ID"`
	Email     string    `gorm:"uniqueIndex" json:"Email"`
	Name      string    `json:"Name"`
	Intro     string    `json:"Intro"`
	Role      string    `gorm:"default:user" json:"Role"` // admin or user
	CreatedAt time.Time `json:"CreatedAt"`
	UpdatedAt time.Time `json:"UpdatedAt"`
}

type Post struct {
	ID        uint           `gorm:"primaryKey" json:"ID"`
	Title     string         `gorm:"not null" json:"Title"`
	Content   string         `gorm:"type:text;not null" json:"Content"`
	AuthorID  string         `gorm:"not null" json:"AuthorID"`
	Author    User           `gorm:"foreignKey:AuthorID" json:"Author"`
	CreatedAt time.Time      `json:"CreatedAt"`
	UpdatedAt time.Time      `json:"UpdatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}
