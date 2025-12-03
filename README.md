# Barter Vibe

A platform for bartering goods and services.

## CI/CD Pipeline

This project uses GitHub Actions for continuous integration and deployment:

- **CI Pipeline**: Runs tests and linting on every push/PR
- **Security Scanning**: Automated vulnerability detection
- **Docker Builds**: Multi-stage Docker images built on every push
- **Deployments**: Automated deployment to staging (develop branch) and production (main branch)

For more details, see the [CI/CD Documentation](./docs/ci-cd-process.md).

## Getting Started

### Prerequisites

- Node.js 16+
- MongoDB
- Docker (optional, for containerized deployment)

### Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a `.env` file based on `.env.example`
4. Run the application: `npm run dev`

### Docker Deployment

For production deployment using Docker:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

For development with Docker:

```bash
docker-compose -f docker-compose.dev.yml up -d
```

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.