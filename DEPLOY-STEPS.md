# Vastu360 deploy steps

## Backend (Render)
1. Put the contents of the `backend` folder into your GitHub backend repo (replace old files). Never upload `.env`.
2. Push. Render deploys automatically.
3. In Render > Environment set: RESEND_API_KEY, SMTP_FROM ("Vastu360 <info@vastu360.my>"), OWNER_EMAIL,
   ADMIN_PASSWORD, REVIEW_SECRET (long random), APP_URL=https://vastu360.my,
   BACKEND_PUBLIC_URL=https://vastu360-backend.onrender.com, MOCK_PAYMENT=true
   (Render free plan blocks SMTP, so use Resend, not SMTP_*).

## Website (Hostinger)
1. In the `frontend` folder run: npm install, then npm run build.
2. hPanel > File Manager > public_html (show hidden files). Back up/delete old files.
3. Upload everything INSIDE `dist` (including .htaccess).

## Notes
- Orders are held in server memory: a Render restart/redeploy clears them. Add a database before taking real customers.
- Check each payment in your bank statement before approving a report.
