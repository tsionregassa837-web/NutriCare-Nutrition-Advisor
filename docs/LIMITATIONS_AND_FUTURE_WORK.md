# Limitations and Future Work

## Current limitations

1. **Food recognition is probabilistic.** Photo analysis depends on the external Gemini model and image quality. The user must review AI results.
2. **Nutrition values are estimates.** Food records are documented as sourced or estimated; they are not a substitute for clinical dietary assessment.
3. **Meal planning uses predefined templates.** The planner does not yet optimize price, ingredient availability, micronutrients, cooking time or household preferences.
4. **JSON persistence is intentionally lightweight.** It is suitable for the project but is not a full production relational database architecture.
5. **AI requires an external service.** Chat and photo analysis are unavailable when the Gemini key is not configured or the provider is unavailable.
6. **No medical diagnosis.** The application is designed for general wellness guidance and must not be used as a replacement for a doctor or registered dietitian.
7. **English/Amharic support is not universal.** The advisor supports an explicit Amharic instruction, while some static content may still depend on the application's translation catalog.
8. **Operational hardening remains deployment-specific.** HTTPS, secret management, backups, monitoring and reverse-proxy configuration must be completed for the selected hosting platform.

## Future work

- Replace JSON persistence with PostgreSQL or another production database.
- Add richer Ethiopian food coverage and more formally maintained source records.
- Add micronutrient-aware planning and more user preference constraints.
- Add grocery-list and budget optimization.
- Improve photo recognition with user confirmation and confidence thresholds.
- Add stronger AI conversation summarization and long-term preference management.
- Expand Amharic coverage across all UI content.
- Add automated end-to-end browser tests.
- Add monitoring, audit logs, backups and production observability.
- Evaluate model quality with a curated Ethiopian-food image test set.
