# FastClean Pro SaaS Architecture

FastClean Pro is structured as a commercial multi-tenant SaaS platform. The MVP screens are only the first interface layer; the data model and application contracts are designed for multiple companies, multiple locations, subscription plans, feature modules, role-based permissions, and i18n from day one.

## Tenant Model

Every tenant owns its operational data through `tenant_id`.

Hierarchy:

- `tenants`
- `companies`
- `locations`
- operational records such as clients, employees, teams, appointments, invoices, payroll, messages, and documents

The application session stores:

- active tenant
- accessible companies
- accessible locations
- active company
- active location
- subscription plan
- role

## Tenant Isolation

PostgreSQL row-level security is enabled for tenant-owned tables.

Runtime database requests must set:

```sql
set app.current_tenant_id = '<tenant uuid>';
```

Tables then use `app_current_tenant_id()` in RLS policies so records from one tenant are not visible to another tenant.

Global catalog tables such as `feature_modules`, `subscription_plans`, and `permissions` are not tenant-owned. Tenant-specific overrides live in tenant-owned tables such as `feature_flags`, `roles`, and `role_permissions`.

## Multi-Company And Multi-Location

The database supports multiple companies per tenant and multiple locations per company.

Operational tables include:

- `tenant_id`
- `company_id` where the record belongs to a company
- `location_id` where the record is location-specific

This supports independent locations, future franchise structures, and company-level reporting without rebuilding the schema.

## Permissions

Permissions are capability based, not hardcoded only by role.

Examples:

- `clients.read`
- `clients.security_codes.read`
- `appointments.update`
- `payroll.manage`
- `billing.manage`
- `audit_logs.read`

Default roles are defined in code for the MVP:

- Owner
- Manager
- Office
- Driver
- Helper

The database also supports custom tenant roles through `roles`, `permissions`, and `role_permissions`.

## Feature Modules And Plans

Modules are defined in `src/config/modules.ts` and mirrored in the database through `feature_modules`.

Plans are defined in `src/lib/plans/plans.ts` and mirrored in:

- `subscription_plans`
- `subscription_plan_modules`
- `tenant_subscriptions`

Access to a module requires:

- tenant is not suspended
- module is included in the tenant plan
- user role has the required permission

## i18n

Routes are locale scoped:

- `/en`
- `/pt`
- `/es`

All interface text must come from:

- `src/i18n/messages/en.json`
- `src/i18n/messages/pt.json`
- `src/i18n/messages/es.json`

Components must not hardcode visible UI copy.

## MVP Alignment

The current MVP screens should remain lightweight until backend integration starts. Their job is to consume architecture contracts:

- sidebar items are gated by module access
- tenant/company/location context appears in the app shell
- route copy comes from dictionaries
- future CRUD should write tenant-scoped records only

Do not recreate the screens from scratch until the backend layer is connected.
