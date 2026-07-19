const fs = require('fs');
let code = fs.readFileSync('firestore.rules', 'utf-8');

const readRules = `
    match /admin_classes/{id} { allow read: if request.auth != null; }
    match /admin_subjects/{id} { allow read: if request.auth != null; }
    match /admin_chapters/{id} { allow read: if request.auth != null; }
    match /admin_pdfs/{id} { allow read: if request.auth != null; }
    match /admin_videos/{id} { allow read: if request.auth != null; }
    match /admin_notes/{id} { allow read: if request.auth != null; }
    match /admin_images/{id} { allow read: if request.auth != null; }
    match /admin_audio/{id} { allow read: if request.auth != null; }
    match /admin_mock_tests/{id} { allow read: if request.auth != null; }
    match /admin_pyq/{id} { allow read: if request.auth != null; }
    match /admin_quizzes/{id} { allow read: if request.auth != null; }
    match /admin_assignments/{id} { allow read: if request.auth != null; }
    match /announcements/{id} { allow read: if request.auth != null; }
    match /admin_notifications/{id} { allow read: if request.auth != null; }
`;

code = code.replace(
  "match /users/{userId} {",
  readRules + "\n    match /users/{userId} {"
);

fs.writeFileSync('firestore.rules', code);
