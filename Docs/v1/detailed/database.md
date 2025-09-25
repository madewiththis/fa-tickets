# Database Schema — Detailed

Canonical source: SQLAlchemy models in `backend/app/db/models` and Alembic migrations.

Tables

event
| Column | Type | Null | Default | Notes |
| - | - | - | - | - |
| id | integer | no | serial | PK |
| title | varchar(255) | no |  |  |
| starts_at | timestamptz | no |  |  |
| ends_at | timestamptz | yes |  |  |
| location_name | varchar(255) | yes |  | renamed from `location` in 0002 |
| location_address | jsonb | yes |  | freeform address fields |
| address_maps_link | varchar(1024) | yes |  |  |
| location_getting_there | text | yes |  |  |
| contact_phone | varchar(64) | yes |  |  |
| contact_email | varchar(255) | yes |  |  |
| contact_url | varchar(1024) | yes |  |  |
| capacity | integer | no |  |  |
| public_id | varchar(64) | yes |  | unique `uq_event_public_id` |
| created_at | timestamptz | no | now() |  |
| updated_at | timestamptz | no | now() | on update now() |

Indexes/constraints
- PK(event.id), UQ(event.public_id)

ticket_type
| Column | Type | Null | Default | Notes |
| - | - | - | - | - |
| id | integer | no | serial | PK |
| event_id | integer | no |  | FK → event.id (CASCADE) |
| name | varchar(100) | no |  |  |
| price_baht | integer | yes |  |  |
| max_quantity | integer | yes |  |  |
| active | boolean | no | true |  |
| created_at | timestamptz | no | now() |  |
| updated_at | timestamptz | no | now() | on update now() |

Indexes/constraints
- FK(ticket_type.event_id → event.id), created/updated timestamps

ticket
| Column | Type | Null | Default | Notes |
| - | - | - | - | - |
| id | integer | no | serial | PK |
| uuid | uuid | no | uuid4 | unique `uq_ticket_uuid` |
| event_id | integer | no |  | FK → event.id (CASCADE), ix_ticket_event_id |
| ticket_type_id | integer | yes |  | FK → ticket_type.id (SET NULL), ix_ticket_ticket_type_id |
| customer_id | integer | yes |  | FK → customer.id (SET NULL), ix_ticket_customer_id |
| short_code | varchar(3) | yes |  | partial unique with (event_id) when not null: `uq_ticket_event_short_code` |
| ticket_number | varchar(20) | yes |  | partial unique with (event_id) when not null: `uq_ticket_event_ticket_number` |
| status | enum(ticket_status) | no | available | available, assigned, delivered, checked_in, void |
| payment_status | enum(payment_status) | no | unpaid | unpaid, paid, waived, refunding, refunded, voiding, voided |
| delivery_status | enum(delivery_status) | no | not_sent | not_sent, sent, bounced |
| assigned_by_person_id | integer | yes |  | FK → person.id (SET NULL) |
| assigned_at | timestamptz | yes |  |  |
| delivered_at | timestamptz | yes |  |  |
| checked_in_at | timestamptz | yes |  |  |
| attendance_refunded | boolean | no | false | attendance flag post-refund |
| holder_contact_id | integer | yes |  | FK → contact.id (SET NULL) |
| purchase_id | integer | yes |  | FK → purchase.id (SET NULL), ix_ticket_purchase_id |
| created_at | timestamptz | no | now() |  |
| updated_at | timestamptz | no | now() | on update now() |

Indexes/constraints
- PK, UQ(uuid), IX(event_id), IX(customer_id), IX(ticket_type_id), IX(purchase_id)
- Partial UQ(event_id, short_code) where short_code IS NOT NULL
- Partial UQ(event_id, ticket_number) where ticket_number IS NOT NULL

contact
| Column | Type | Null | Default | Notes |
| - | - | - | - | - |
| id | integer | no | serial | PK |
| first_name | varchar(100) | yes |  |  |
| last_name | varchar(100) | yes |  |  |
| email | varchar(255) | no |  | unique `uq_contact_email` |
| phone | varchar(50) | yes |  |  |
| created_at | timestamptz | no | now() |  |
| updated_at | timestamptz | no | now() | on update now() |

Indexes/constraints
- UQ(contact.email)

purchase
| Column | Type | Null | Default | Notes |
| - | - | - | - | - |
| id | integer | no | serial | PK |
| buyer_contact_id | integer | no |  | FK → contact.id (CASCADE) |
| external_payment_ref | varchar(100) | yes |  | PSP reference (if any) |
| total_amount | integer | yes |  | minor units (baht) |
| currency | varchar(10) | yes |  |  |
| created_at | timestamptz | no | now() |  |

Indexes/constraints
- FK(purchase.buyer_contact_id → contact.id)

customer (legacy)
| Column | Type | Null | Default | Notes |
| - | - | - | - | - |
| id | integer | no | serial | PK |
| first_name | varchar(100) | yes |  |  |
| last_name | varchar(100) | yes |  |  |
| email | varchar(255) | yes |  | index `ix_customer_email` |
| phone | varchar(50) | yes |  |  |
| created_at | timestamptz | no | now() |  |
| updated_at | timestamptz | no | now() | on update now() |

Indexes/constraints
- IX(customer.email)

person
| Column | Type | Null | Default | Notes |
| - | - | - | - | - |
| id | integer | no | serial | PK |
| name | varchar(150) | no |  |  |
| email | varchar(255) | no |  | index `ix_person_email` |
| role | enum(person_role) | no | seller | admin, seller, checker |
| created_at | timestamptz | no | now() |  |
| updated_at | timestamptz | no | now() | on update now() |

Indexes/constraints
- IX(person.email)

event_promotion
| Column | Type | Null | Default | Notes |
| - | - | - | - | - |
| id | integer | no | serial | PK |
| event_id | integer | no |  | FK → event.id (CASCADE), unique index per event |
| content | jsonb | yes |  |  |
| created_at | timestamptz | no | now() |  |
| updated_at | timestamptz | no | now() | on update now() |

Indexes/constraints
- Unique IX on event_id: one promotion row per event

Enums
- person_role: admin, seller, checker
- ticket_status: available, assigned, delivered, checked_in, void
- payment_status: unpaid, paid, waived, refunding, refunded, voiding, voided
- delivery_status: not_sent, sent, bounced

Notes
- See migrations 0005–0007 for contact/purchase introduction and ticket updates.
- Legacy `customer` kept for historical linkage; new flows use `contact` and `purchase`.

