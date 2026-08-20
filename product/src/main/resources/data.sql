-- Seed data for the standalone (H2) profile only.
-- Spring Boot runs data.sql automatically for embedded databases
-- (spring.sql.init.mode=embedded default); it does NOT run against PostgreSQL.
--
-- The YAS product-service ships with DDL-only Liquibase changelogs (no INSERTs),
-- so the catalog is empty out of the box. Without products, /storefront/products
-- returns an empty list and the media dependency is NEVER called — which makes
-- performance and chaos tests vacuous. This seed creates 100 published products,
-- each with a non-null thumbnail_media_id so the media service is exercised on
-- every list-products request (getProductsByMultiQuery calls getMedia per product).

INSERT INTO product (
    name, slug, sku, gtin, price,
    is_published, is_visible_individually, is_featured,
    is_allowed_to_order, has_options, stock_tracking_enabled, tax_included,
    thumbnail_media_id
)
SELECT
    'Product ' || "X",
    'product-' || "X",
    'SKU-' || "X",
    'GTIN-' || "X",
    100.0,
    true,
    true,
    false,
    true,
    false,
    false,
    false,
    "X"
FROM SYSTEM_RANGE(1, 100);
