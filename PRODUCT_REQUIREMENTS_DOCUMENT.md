## 0 — Executive Summary

**Product name:** SpecForge

**Ultimate product goal:** Provide a managed, client-side tool that takes a user's app idea and, using a managed Gemini AI API, generates a comprehensive technical specification. The application supports user authentication via Google, saving specs to a cloud database (Firestore), interactive content refinement, and metered AI usage based on the user's plan.

**Ultimate user goal:** Quickly transform a raw app idea into a structured, developer-ready technical specification, with the ability to save progress in the cloud and access it from anywhere, without needing to manage their own AI API keys.

---

## 1 — Personas & Top‑Level Use Cases

| Persona             | Pain Point                                     | Key Jobs to Be Done                                                                 |
| ------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------- |
| **Solo-maker/Dev**  | Blank-page paralysis, losing work             | 1) Log in 2) Input idea ➜ get full spec (within limits) 3) Save & load specs from the cloud |
| **Product Manager** | Quickly drafting initial specs for discussion  | 1) Generate baseline docs 2) Analyze spec for gaps 3) Export for team sharing   |

---

## 2 — Success Metrics

1.  **Time-to-first-spec-chunk:** ≤ 10 seconds after submitting idea (95th percentile).
2.  **Successful spec generation rate:** ≥ 95% (full spec stream completes without unrecoverable errors).
3.  **User Authentication Rate:** A significant percentage of users log in to use cloud and generation features.
4.  **Feature adoption:** Users utilize "Analyze," "Elaborate," "Regenerate," and cloud save/load features.
5.  **Free-to-Paid Conversion Rate:** (Future Metric) Percentage of "Spark" users who upgrade to a paid plan.

---

## 3 — Functional Requirements

### 3.1 User Authentication (Firebase)

*   **Requirement:** Users must be able to sign in and out of the application using their Google account to access any core features.
*   **Behavior (Login):**
    1.  User clicks a "Sign In with Google" button.
    2.  Upon successful authentication, a user profile is created or loaded from Firestore, their subscription plan ("Spark" by default) and generation credits are determined, and their saved specs are listed.
*   **Behavior (Logout):** User is signed out, and the UI returns to a logged-out state.
*   **Session Persistence:** User sessions are persisted across browser reloads.

### 3.2 Key & Credential Configuration

#### 3.2.1 Managed Gemini API Key
*   **Requirement:** The application uses its own managed Gemini API key, provided via the `process.env.API_KEY` environment variable during deployment.
*   **Behavior:**
    *   This key is a server-side/deployment concern and is **never** exposed to or managed by the end-user.
    *   If the key is missing in the deployment environment, AI-dependent features are disabled, and a generic error message is shown to the user.

#### 3.2.2 Firebase Configuration
*   **Requirement:** The application's Firebase credentials are hardcoded in `firebaseConfig.ts` to ensure reliable connection to the BaaS.

### 3.3 Idea Submission & Specification Generation

**Happy Path**

1.  A logged-in user with generation credits remaining inputs their app idea.
2.  User clicks "Forge Specs."
3.  App validates input and checks generation credit balance.
4.  App calls the Gemini API via the managed service.
5.  The generated spec is streamed to the UI.
6.  The user's generation credit count is decremented by one.

**Edge Cases & Errors**
*   User is not logged in.
*   **User has no generation credits left.** The UI must block the generation request and direct the user to the Billing page.
*   The managed API key is missing or invalid (a site-wide operational error).
*   The AI API returns an error.

### 3.4 User Profile & Usage Metering

*   **Requirement:** On first login, a profile document must be created for the user in Firestore.
*   **Data Stored:** The profile will store the user's current plan (e.g., 'free') and their usage count for the current monthly cycle.
*   **Monthly Reset:** The generation count must automatically reset to 0 every 30 days.

### 3.5 Specification Display & Interaction

*   **Section Navigation:** Sidebar lists all H3-level sections.
*   **Copy/Download:** Buttons to copy Markdown or download a file.
*   **Interactive Refinement:** Features like "Elaborate" and "Regenerate" are also considered "generations" and must be subject to the same usage limits. (Note: Currently implemented to share the same counter).

### 3.6 Save & Load Specifications (Firestore Cloud Storage)

*   **Requirement:** A logged-in user can save, load, and delete their generated specifications from the cloud. This functionality is independent of generation limits.

---

## 4 — Non‑Functional Requirements

| Aspect             | Requirement                                                                   |
| ------------------ | ----------------------------------------------------------------------------- |
| **Responsiveness** | App UI is responsive and usable on desktop, tablet, and mobile browsers.    |
| **Performance**    | UI remains interactive during spec generation. Firestore queries are efficient. |
| **Accessibility**  | Use of ARIA attributes and semantic HTML for key interactive elements.       |
| **Scalability**    | Firestore usage should be efficient to handle a growing number of users and specs. |

---

## 5 — Security Considerations

*   **API Key:** The managed Gemini API key must be kept secure in the deployment environment and never exposed client-side.
*   **Firestore Security Rules:** **Crucial Requirement:** Firestore must be configured with security rules that ensure users can only read/write their own documents in both the `specs` and `userProfiles` collections.
*   **Authentication:** Rely on Firebase Authentication's secure handling of the Google sign-in flow.

---

## 6 — Technical Architecture

```mermaid
graph TD
    A[User's Browser (React App)] -- Firebase SDK --> C{Firebase};
    subgraph "Application Backend (Managed by Owner)"
      B[Gemini API]
    end
    subgraph "Google Cloud Platform"
      C -- Auth --> D[Firebase Authentication];
      C -- CRUD Ops --> E[Firestore Database];
    end
    A -- HTTPS Request (via managed service) --> B
```

*   **Client-Side:** React, TypeScript.
*   **AI Interaction:** Handled by the application's managed service layer.
*   **Backend-as-a-Service (BaaS):** Firebase for Authentication and Database.

---

## 7 — Data Model (Firestore)

**Collection:** `specs`
*   Stores the content of each specification generated by a user.
*   **Security Rule:** `allow read, write: if request.auth.uid == resource.data.userId;`

**Document Example (`specs`):**
```json
// Document ID: auto-generated
{
  "userId": "firebase_uid_string",
  "name": "My Awesome App Spec",
  "ideaText": "An app that does things...",
  "generatedSpec": "### 1. PRD...",
  "createdAt": "2023-10-27T10:00:00Z",
  "updatedAt": "2023-10-27T10:05:00Z"
}
```

**Collection:** `userProfiles`
*   Stores user-specific metadata, including their plan and usage.
*   **Security Rule:** `allow read, write: if request.auth.uid == resource.id;`

**Document Example (`userProfiles`, ID is user's UID):**
```json
// Document ID: firebase_uid_string
{
  "uid": "firebase_uid_string",
  "plan": "free", // or "forge", "architect"
  "generationsUsedThisMonth": 1,
  "monthlyCycleStart": "2023-11-01T12:00:00Z" // Firestore Timestamp
}
```
---

## 8 — Logging & Monitoring (MVP Client-Side)

*   **Primary Tool:** Browser's Developer Console.
*   **Events Logged:**
    *   Auth state changes.
    *   Firebase service call successes and failures.
    *   AI API call successes and failures (for admin debugging).
    *   Generation credit checks and decrements.

---

## 9 — Open Questions & Future Considerations

1.  **Hardening Metering:** For paid plans, usage counting must be moved to a secure backend (e.g., Firebase Functions) to prevent client-side manipulation.
2.  **Payment Gateway:** Integration with a provider like Stripe is required for paid tiers.
3.  **Defining "Generation":** Does "Elaborate" or "Regenerate" count as a full generation? (Assumption: Yes, they all count as 1). This needs to be clear to the user.
