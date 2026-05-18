PET CARE V5 - SAFER VISITS AND PET-BASED REPEAT

Changes in this version:

1. Removed the global Repeat Last Service Shortcut from Schedule.
   - Repeat is now tied to a selected pet or a recent visit for the selected owner.

2. Schedule > Add Scheduled Visit now shows recent visits for the selected owner above Visit Notes.
   - Use as Template copies the selected recent visit into a new scheduled visit.
   - It does not copy completed status, paid status, actual start/end times, or completion/incident notes.

3. If the selected owner has only one active pet, that pet is automatically selected.

4. Pet selection buttons now show pet type faces:
   - Dog = dog face button
   - Cat = cat face button
   - Other species = rounded paw button

5. Scheduled/active visits can now be deleted.
   - Delete is available from Schedule cards and Owner > Visits.
   - Completed visits are protected from the quick delete button on visit cards, but can still be managed through history/delete controls if needed.

6. Owner delete button is now smaller and separated from the main Edit button.

7. Pet deletion is safer.
   - Pet deletion is in a danger zone.
   - Deleting a pet requires typing the exact pet name.

8. Owner deletion is also safer.
   - Deleting an owner requires typing the exact owner name.

No database migration is required for this version.
Keep the existing .env.local file.
