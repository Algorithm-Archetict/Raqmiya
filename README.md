# 🏪 Raqmiya - Digital Marketplace Platform

<div align="center">

![Raqmiya Logo](https://img.shields.io/badge/Raqmiya-Digital%20Marketplace-blue?style=for-the-badge&logo=shopping-cart)

[![.NET](https://img.shields.io/badge/.NET-8.0-purple?style=flat-square&logo=dotnet)](https://dotnet.microsoft.com/)
[![Angular](https://img.shields.io/badge/Angular-20.0-red?style=flat-square&logo=angular)](https://angular.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)

**A comprehensive digital marketplace connecting creators with customers worldwide**

[Features](#-features) • [Quick Start](#-quick-start) • [Architecture](#-architecture) • [API Documentation](#-api-documentation) • [Contributing](#-contributing)

</div>

---

## 📖 Overview

Raqmiya is a modern, full-stack digital marketplace platform that enables creators to sell digital products, courses, and services while providing customers with a secure and user-friendly shopping experience. Built with cutting-edge technologies including .NET 8, Angular 20, and real-time communication capabilities.

## ✨ Features

### 🛒 **Core Marketplace**
- **Digital Product Sales** - Upload and sell digital products, courses, software, and templates
- **Secure Payment Processing** - Stripe integration with multiple payment methods
- **Instant Downloads** - Automatic product delivery after purchase
- **Advanced Search & Filtering** - Find products by category, price, rating, and more
- **Review & Rating System** - Customer feedback and product quality assurance

### 💬 **Real-time Communication**
- **Live Messaging** - Real-time chat between customers and creators
- **Service Requests** - Request custom services with budget proposals
- **SignalR Integration** - Instant notifications and presence indicators
- **File Attachments** - Share files and images in conversations
- **Message Status** - Read receipts and delivery confirmations

### 🤖 **AI-Powered Features**
- **AI Chatbot** - Intelligent customer support with RAG (Retrieval-Augmented Generation)
- **Content Moderation** - Google Vision API integration for image safety
- **Knowledge Base** - AI-powered help system with document analysis
- **Smart Recommendations** - Personalized product suggestions

### 👤 **User Management**
- **Multi-Role System** - Admin, Creator, and Customer roles
- **Profile Management** - Comprehensive user profiles with customization
- **Account Security** - JWT authentication with password policies
- **Admin Dashboard** - Complete user and platform management

### 📊 **Analytics & Reporting**
- **Revenue Analytics** - Detailed sales and earnings reports
- **User Engagement** - Track customer behavior and preferences
- **Product Performance** - View metrics, downloads, and reviews
- **Financial Insights** - Revenue tracking with currency support

### 🔒 **Security & Quality**
- **Content Moderation** - AI-powered image and content filtering
- **Secure File Upload** - Validated file types and size limits
- **Data Protection** - GDPR compliant data handling
- **Audit Logging** - Complete activity tracking

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18+)
- **.NET 8 SDK**
- **SQL Server** (LocalDB or full instance)
- **Git**

### 1. Clone the Repository

```bash
git clone https://github.com/Algorithm-Archetict/Raqmiya.git
cd Raqmiya
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd Backend

# Restore NuGet packages
dotnet restore

# Update database connection string in appsettings.json
# Run database migrations
dotnet ef database update --project Infrastructure --startup-project API

# Start the API
cd API
dotnet run
```

The API will be available at `https://localhost:5255`

### 3. Frontend Setup

```bash
# Navigate to frontend directory
cd Frontend

# Install dependencies
npm install

# Start development server
ng serve

# Or start with automatic browser opening
ng serve -o
```

The frontend will be available at `http://localhost:4200`

### 4. Google Cloud Setup (Optional - for AI features)

1. Create a Google Cloud Project
2. Enable the Vision API
3. Create a service account and download credentials
4. Place credentials file in `Backend/API/credentials/`
5. Update the path in `appsettings.Development.json`

## 🏗️ Architecture

### Technology Stack

#### **Backend (.NET 8)**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Layer     │    │  Core Layer     │    │Infrastructure   │
│                 │    │                 │    │                 │
│ • Controllers   │◄───┤ • Entities      │◄───┤ • Data Context  │
│ • SignalR Hubs  │    │ • Interfaces    │    │ • Repositories  │
│ • Middleware    │    │ • Services      │    │ • Migrations    │
│ • Authentication│    │ • DTOs          │    │ • External APIs │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

#### **Frontend (Angular 20)**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Components    │    │    Services     │    │     Guards      │
│                 │    │                 │    │                 │
│ • Pages         │◄───┤ • HTTP Services │◄───┤ • Auth Guard    │
│ • Shared UI     │    │ • SignalR       │    │ • Admin Guard   │
│ • Forms         │    │ • State Mgmt    │    │ • Role Guard    │
│ • Admin Panel   │    │ • Utilities     │    │ • Route Guard   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Key Components

#### **Backend Services**
- **MessagingService** - Real-time communication and service requests
- **FileModerationService** - AI-powered content filtering
- **StripeService** - Payment processing and subscriptions
- **RevenueAnalyticsService** - Financial reporting and insights
- **EmailService** - SMTP notifications and communications

#### **Frontend Features**
- **Chat System** - Real-time messaging with SignalR
- **AI Chatbot** - RAG-powered customer support
- **Admin Dashboard** - Complete platform management
- **Product Management** - Creator tools for product lifecycle
- **Settings Panel** - User profile and preferences

## 📚 API Documentation

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | User authentication |
| `POST` | `/api/auth/register` | User registration |
| `POST` | `/api/auth/change-password` | Password modification |

### Product Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/products` | Get all products |
| `POST` | `/api/products` | Create new product |
| `PUT` | `/api/products/{id}` | Update product |
| `DELETE` | `/api/products/{id}` | Delete product |
| `POST` | `/api/products/upload-image` | Upload product image |
| `POST` | `/api/products/upload-file` | Upload product file |

### Messaging System

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/messaging/conversations` | Get user conversations |
| `POST` | `/api/messaging/send` | Send message |
| `POST` | `/api/messaging/service-request` | Create service request |
| `PUT` | `/api/messaging/service-request/{id}/accept` | Accept service request |

### Payment Processing

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/payment/create-intent` | Create payment intent |
| `GET` | `/api/payment/methods` | Get payment methods |
| `POST` | `/api/payment/process` | Process payment |

## 🛠️ Development

### Project Structure

```
Raqmiya/
├── Backend/
│   ├── API/                 # Web API and Controllers
│   ├── Core/                # Business Logic and Entities
│   ├── Infrastructure/      # Data Access and External Services
│   └── Shared/              # Common DTOs and Constants
├── Frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/  # Reusable UI Components
│   │   │   ├── features/    # Feature Modules
│   │   │   ├── services/    # HTTP and Business Services
│   │   │   └── guards/      # Route Protection
│   │   └── assets/          # Static Assets and Knowledge Base
└── Documentation/           # API and Feature Documentation
```

### Environment Configuration

#### Backend (`appsettings.Development.json`)
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=(localdb)\\mssqllocaldb;Database=RaqmiyaDB;Trusted_Connection=true;"
  },
  "JwtSettings": {
    "SecretKey": "your-secret-key",
    "Issuer": "http://localhost:5255",
    "Audience": "http://localhost:4200"
  },
  "Stripe": {
    "SecretKey": "sk_test_...",
    "PublishableKey": "pk_test_..."
  },
  "GoogleCloud": {
    "CredentialsPath": "credentials/your-service-account.json"
  }
}
```

#### Frontend (`environment.ts`)
```typescript
export const environment = {
  production: false,
  apiUrl: 'https://localhost:5255/api',
  signalRUrl: 'https://localhost:5255/chatHub',
  stripePublishableKey: 'pk_test_...'
};
```

### Database Migrations

```bash
# Create new migration
dotnet ef migrations add MigrationName --project Infrastructure --startup-project API

# Update database
dotnet ef database update --project Infrastructure --startup-project API

# Drop database (development only)
dotnet ef database drop --project Infrastructure --startup-project API
```

### Testing

```bash
# Run backend tests
cd Backend
dotnet test

# Run frontend tests
cd Frontend
ng test

# Run e2e tests
ng e2e
```

## 🔧 Configuration

### Required Environment Variables

Create a `.env` file in the backend directory:

```env
# Database
CONNECTION_STRING=Server=(localdb)\\mssqllocaldb;Database=RaqmiyaDB;Trusted_Connection=true;

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_ISSUER=http://localhost:5255
JWT_AUDIENCE=http://localhost:4200

# Stripe

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587

# Google Cloud 
```

### Feature Flags

Enable/disable features in `appsettings.json`:

```json
{
  "Features": {
    "EnableAIModeration": true,
    "EnableChatbot": true,
    "EnableAnalytics": true,
    "EnableNotifications": true
  }
}
```

## 📦 Deployment

### Production Build

#### Backend
```bash
cd Backend/API
dotnet publish -c Release -o ./publish
```

#### Frontend
```bash
cd Frontend
ng build --configuration production
```

### Docker Support

```dockerfile
# Backend Dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 80

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["API/API.csproj", "API/"]
RUN dotnet restore "API/API.csproj"
COPY . .
WORKDIR "/src/API"
RUN dotnet build "API.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "API.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "API.dll"]
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

### Code Style

- **Backend**: Follow C# coding conventions
- **Frontend**: Use Angular style guide and Prettier formatting
- **Commits**: Use conventional commit messages

## 🏆 Acknowledgments

- Built with ❤️ by the RAQMIYA team
- Powered by .NET 8 and Angular 20
- AI capabilities by Google Cloud Vision API
- Payment processing by Stripe

---

<div align="center">

**⭐ Star this repository if you find it helpful!**

[Report Bug](https://github.com/Algorithm-Archetict/Raqmiya/issues) • [Request Feature](https://github.com/Algorithm-Archetict/Raqmiya/issues) • [Documentation](https://github.com/Algorithm-Archetict/Raqmiya/wiki)

</div>