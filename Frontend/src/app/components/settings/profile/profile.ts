import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-profile',
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css'
})
export class Profile {
  profileData = {
    username: '',
    email: '',
    description: ''
  };

  profilePicture: string | null = null;

  constructor() {
    // TODO: Load user profile data from service
    this.loadProfileData();
  }

  loadProfileData() {
    // TODO: Implement API call to load profile data
    // For now, using mock data
    this.profileData = {
      username: 'johndoe',
      email: 'john.doe@example.com',
      description: 'Digital creator and content developer'
    };
  }

  uploadPicture() {
    // Create a file input element
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/jpeg,image/png';
    
    fileInput.onchange = (event: any) => {
      const file = event.target.files[0];
      if (file) {
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          alert('File size must be less than 5MB');
          return;
        }
        
        // Validate file type
        if (!file.type.match('image/(jpeg|png)')) {
          alert('Please select a JPG or PNG file');
          return;
        }
        
        // Create a preview URL
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.profilePicture = e.target.result;
        };
        reader.readAsDataURL(file);
        
        // TODO: Upload file to server
        console.log('Uploading file:', file.name);
      }
    };
    
    fileInput.click();
  }

  removePicture() {
    this.profilePicture = null;
  }

  onImageError(event: any) {
    event.target.src = 'assets/images/default-avatar.svg';
  }
} 