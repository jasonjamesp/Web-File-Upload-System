# Web-File-Upload-System
Web application that securely uploads files and checks file integrity.



Objectives of the Project:

1. Secure Upload Interface: Implement a web-based file upload interface that
accepts any file type and processes it securely before storage.
2. AES Encryption (Confidentiality): Encrypt each uploaded file using the AES
(Advanced Encryption Standard) algorithm, ensuring that stored ciphertext
cannot be read even if the server is compromised.
3. SHA-256 Integrity Hashing: Generate a SHA-256 cryptographic hash of every
uploaded file before encryption and store the hash in a database as the file's
unique fingerprint.
4. Tamper Detection & Verification: Provide a one-click Verify Integrity feature
that recomputes the file hash on demand and compares it against the stored
fingerprint, alerting the user if a mismatch is detected.
5. Security Demonstration: Demonstrate the tamper-detection mechanism in a live
security demo by manually modifying a stored encrypted file and showing the
resulting integrity warning in the UI.
