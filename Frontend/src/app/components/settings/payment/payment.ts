import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-payment',
  imports: [CommonModule, FormsModule],
  templateUrl: './payment.html',
  styleUrl: './payment.css'
})
export class Payment {
  paymentData = {
    paypalEmail: '',
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    postalCode: '',
    country: '',
    birthDay: '',
    birthMonth: '',
    birthYear: ''
  };

  isPayPalConnected = false;
  connectedPayPalAccount = '';

  // Date dropdowns data
  days = Array.from({length: 31}, (_, i) => i + 1);
  months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  years = Array.from({length: 100}, (_, i) => new Date().getFullYear() - i);

  // Payment history
  paymentHistory: any[] = [];

  constructor() {
    // TODO: Load payment data from service
    this.loadPaymentData();
  }

  loadPaymentData() {
    // TODO: Implement API call to load payment data
    // For now, using empty data
    this.paymentData = {
      paypalEmail: '',
      firstName: '',
      lastName: '',
      address: '',
      city: '',
      postalCode: '',
      country: '',
      birthDay: '',
      birthMonth: '',
      birthYear: ''
    };

    // PayPal connection status
    this.isPayPalConnected = false;
    this.connectedPayPalAccount = '';
  }

  connectPayPal() {
    // TODO: Implement PayPal OAuth flow
    console.log('Connecting PayPal...');
    
    // Mock connection
    setTimeout(() => {
      this.isPayPalConnected = true;
      this.connectedPayPalAccount = this.paymentData.paypalEmail || 'connected@paypal.com';
    }, 1000);
  }

  disconnectPayPal() {
    // TODO: Implement PayPal disconnection
    console.log('Disconnecting PayPal...');
    
    this.isPayPalConnected = false;
    this.connectedPayPalAccount = '';
  }

  savePaymentData() {
    // TODO: Implement API call to save payment data
    console.log('Saving payment data...', this.paymentData);
  }
} 