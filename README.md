# Raqmiya

Raqmiya is a digital marketplace platform that enables users to buy, sell, and manage digital products. It features robust product moderation, licensing, user management, wishlists, analytics, and more. The project is built with a modern Angular frontend and a scalable .NET 8 backend.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [Development](#development)
- [Project Structure](#project-structure)

---

## Features

- **User Registration & Authentication**: Secure registration, login, and authentication with password hashing.
- **Product Management**: CRUD for digital products, categories, and tags; moderation by admins (approve/reject, moderation logs); file management for product assets.
- **Wishlist**: Users can add/remove products to/from wishlists and view them.
- **Licensing**: Track and manage product licenses per user and order.
- **Order System**: Manage purchases, licenses, and user order history.
- **Reviews & Ratings**: Users can review and rate products.
- **Analytics & Metrics**: View top-rated, most wished, best-selling, and trendy products, plus product view tracking.
- **Search & Filtering**: Advanced search and filtering by categories and tags.

---

## Architecture

Raqmiya uses a layered architecture:

- **Frontend**: Angular application for a responsive, modern UI.
- **Backend**: ASP.NET Core 8 Web API implementing all business logic and exposing RESTful endpoints.
- **Infrastructure**: Implements repository pattern with Entity Framework Core for data persistence.
- **Database**: SQL Server (default, can be customized).

---

## Technology Stack

- **Frontend**:
  - Angular 20+
  - TypeScript, HTML, CSS

- **Backend**:
  - ASP.NET Core 8 (C#)
  - Entity Framework Core 8

- **Database**:
  - SQL Server (configurable)

- **Other**:
  - Dependency Injection for services and repositories
  - Unit and integration testing frameworks

---

## Getting Started

### Prerequisites

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js](https://nodejs.org/)
- [Angular CLI](https://github.com/angular/angular-cli)
- SQL Server (or compatible database)

### Backend Setup

1. Navigate to `Backend/API`.
2. Configure your database connection string in `appsettings.json`.
3. Run database migrations (if required):
   ```bash
   dotnet ef database update
   ```
4. Start the backend API:
   ```bash
   dotnet run
   ```

### Frontend Setup

1. Navigate to `Frontend`.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   ng serve
   ```
4. Open your browser at [http://localhost:4200/](http://localhost:4200/).

---

## Development

### Frontend

- Uses Angular CLI for scaffolding, building, testing, and serving.
- Common commands:
  - `ng serve` – Start dev server
  - `ng build` – Build the project
  - `ng test` – Run unit tests
  - `ng e2e` – Run end-to-end tests

See [Frontend/README.md](Frontend/README.md) for more details.

### Backend

- Organized by DDD-style layers: API, Core, Infrastructure
- Run and debug using Visual Studio, Rider, or `dotnet` CLI.

---

## Project Structure

```
Backend/
  API/               # ASP.NET Core 8 API
  Core/              # Business logic, interfaces
  Infrastructure/    # Data access, repositories, EF models

Frontend/
  src/               # Angular app source code

README.md            # This file
```

---
