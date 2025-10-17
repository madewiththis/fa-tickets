# FlowApps Deployment Process

This document outlines the process for deploying applications from local development to production.

## Key People

- **Tong** - Python Dev (Backend reviews, Kubernetes templates, Lens access)
- **Nice, Bell, Naam** - Frontend Devs (Frontend reviews)
- **Infrastructure Team** - Runbook review and production setup (Kluay)
- **CTO** - Wiki access

## Deployment Steps

1. **Local Setup** ✅
   - [x] Get frontend, backend, and database running in local Docker containers
   - [x] Verify all services communicate properly

2. **Configuration** ✅
   - [x] Make database connection configurable
   - [x] Make database endpoints configurable in frontend
   - [x] Test configuration changes locally

3. **Infrastructure Setup** 🔄
   - [x] Create Kubernetes YAML files (ask Tong for templates) - na using docker hub
   - [x] Write database migration scripts for PostgreSQL
   - [ ] Test migrations with sandbox server

4. **Code Review** ❌
   - [ ] Submit backend PR to `python.workspace` (Tong - Python Dev)
   - [ ] Submit frontend PR for review (Nice, Bell, Naam - Frontend Devs)

5. **Production Deployment** ❌
   - [ ] Setup load balancer
   - [ ] Configure DNS
   - [ ] Deploy to production environment

## Setup Tasks

- [ ] Get Lens login credentials from Tong (Sandbox & Production) - na
- [ ] Write deployment runbook
- [ ] Get runbook reviewed by infrastructure team 



