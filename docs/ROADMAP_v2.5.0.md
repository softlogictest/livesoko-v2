# LiveSoko v2.5.0: The "Always-On" Update
**Status:** Planning Phase

This document outlines the planned features and architectural updates for version 2.5.0. The primary goals of this release are to secure the onboarding pipeline, improve buyer-seller communication, and transform the platform from a "live-only" tool into a 24/7 social storefront.

## 1. Security & Onboarding Hardening
Currently, the system is vulnerable to infinite trial abuse and ghost accounts due to loose email validation.

*   **Email Verification Loop:** Implement a strict verification process. Users must click a verification link sent to their email before accessing the dashboard, preventing fake `@.something` registrations.
*   **Trial Abuse Prevention:** Introduce a friction point to stop "infinite trial" looping. This will likely be **Phone Number Verification (OTP)** or a nominal M-Pesa commitment fee (e.g., Ksh 10) to activate the 14-day trial.
*   **UX Improvement:** Add a "Password Visibility" toggle (eye icon) to the login and registration forms to reduce friction and typos.

## 2. The 24/7 "Offline" Storefront (Enquiries Feature)
Currently, the public Shop Link (placed in a TikTok bio) is a dead-end if the seller is not actively live. 

*   **Public Enquiries Page:** When no live session is active, the public link will display an "Offline Storefront" where buyers can browse and submit inquiries.
*   **Seller Inbox:** Add a new "Enquiries" tab to the seller's dashboard. Sellers can review requests, reply, and turn inquiries into active orders.

## 3. Buyer Experience & Automated Communication
*   **Product Description Field:** Update the public order form to include a dedicated "Product Description / Specifics" text area, allowing buyers to clearly describe variants (size, color, specifics) they want.
*   **WhatsApp Automation:** Implement an automated workflow where a buyer receives an automatic WhatsApp confirmation message the moment a seller marks their purchase as "VERIFIED" on the dashboard.

---
*Document prepared for future development sprints. No code changes have been applied yet.*
