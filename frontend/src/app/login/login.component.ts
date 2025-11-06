import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, User } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  users: User[] = [];
  selectedUser: User | null = null;
  password: string = '';
  errorMessage: string = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Load users from JSON
    fetch('/assets/users.json')
      .then(response => response.json())
      .then(data => {
        this.users = data;
      })
      .catch(error => {
        console.error('Error loading users:', error);
      });
  }

  onLogin(): void {
    if (!this.selectedUser) {
      this.errorMessage = 'Please select a user';
      return;
    }

    if (!this.password) {
      this.errorMessage = 'Please enter a password';
      return;
    }

    // For this demo, any password is accepted
    this.errorMessage = '';
    this.authService.login(this.selectedUser);
  }
}
