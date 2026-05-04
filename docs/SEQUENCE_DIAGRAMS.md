# TeamNest — Sequence Diagrams

End-to-end flows that cross service boundaries. Each diagram shows the *shape* of the interaction; per-step detail (validation rules, exact DB columns, error codes) lives in the code and OpenAPI spec.

## Contents

1. [Signup & Email Verification](#1-signup--email-verification)
2. [Login + Refresh Token Rotation](#2-login--refresh-token-rotation)
3. [Password Reset](#3-password-reset)
4. [Create Organization + Stripe Upgrade](#4-create-organization--stripe-upgrade)
5. [Join Organization (request → approve)](#5-join-organization-request--approve)
6. [Team + Member Management](#6-team--member-management)
7. [Channel Messaging (WebSocket)](#7-channel-messaging-websocket)
8. [File Upload + Indexing](#8-file-upload--indexing)
9. [Task Lifecycle](#9-task-lifecycle)
10. [AI Assistant (RAG)](#10-ai-assistant-rag)
11. [Direct Messages](#11-direct-messages)
12. [Presence WebSocket](#12-presence-websocket)

---

## 1. Signup & Email Verification

```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend
    participant API as Plateforme
    participant DB as Base de données
    participant Mail as Service Email

    User->>FE: Soumettre inscription
    FE->>API: Créer compte
    API->>DB: Enregistrer utilisateur
    API-->>FE: Compte créé
    FE-->>User: Vérifier votre email

    Note over User,Mail: Vérification requise avant toute action

    User->>FE: Demander code
    FE->>API: Envoyer code
    API->>DB: Enregistrer code
    API->>Mail: Envoyer email
    Mail-->>User: Code reçu
    API-->>FE: OK
    FE-->>User: Code envoyé

    User->>FE: Saisir code
    FE->>API: Vérifier email
    API->>DB: Vérifier code
    alt Code valide
        API->>DB: Marquer vérifié
        API-->>FE: Email vérifié
    else Code invalide
        API-->>FE: Erreur
    end
    FE-->>User: Compte vérifié
```

---

## 2. Login + Refresh Token Rotation

```mermaid
sequenceDiagram
    actor User
    participant API as Plateforme
    participant DB as Base de données

    User->>API: Se connecter
    API->>DB: Vérifier identifiants
    alt Identifiants valides
        API->>DB: Enregistrer session
        API-->>User: Jetons d'accès
    else Identifiants invalides
        API-->>User: Erreur
    end

    Note over User,API: Plus tard — jeton expiré

    User->>API: Rafraîchir jeton
    API->>DB: Vérifier jeton
    alt Jeton valide
        API->>DB: Renouveler jeton
        API-->>User: Nouveaux jetons
    else Jeton invalide
        API-->>User: Erreur
    end
```

---

## 3. Password Reset

```mermaid
sequenceDiagram
    actor User
    participant API as Plateforme
    participant DB as Base de données
    participant Mail as Service Email

    User->>API: Mot de passe oublié
    opt Utilisateur existe
        API->>DB: Enregistrer code
        API->>Mail: Envoyer code
        Mail-->>User: Email reçu
    end
    API-->>User: Confirmation

    User->>API: Vérifier code
    API->>DB: Vérifier code
    alt Code valide
        API-->>User: OK
    else Code invalide
        API-->>User: Erreur
    end

    User->>API: Réinitialiser mot de passe
    alt Code valide
        API->>DB: Modifier mot de passe
        API-->>User: Succès
    else Code invalide
        API-->>User: Erreur
    end
```

---

## 4. Create Organization + Stripe Upgrade

```mermaid
sequenceDiagram
    actor Admin
    participant API as Plateforme
    participant DB as Base de données
    participant Cloud as Cloudinary
    participant Stripe

    Note over Admin,DB: ref : S'authentifier

    alt Email vérifié
        API->>DB: Vérifier statut
    else Non vérifié
        API-->>Admin: Vérifier email
    end

    Admin->>API: Créer organisation
    opt Logo fourni
        API->>Cloud: Téléverser logo
    end
    API->>DB: Enregistrer organisation
    API-->>Admin: Organisation créée

    Admin->>API: Souscrire abonnement
    API->>DB: Vérifier permissions
    API->>Stripe: Démarrer paiement
    API-->>Admin: Rediriger vers paiement

    Stripe->>API: Notification paiement
    API->>DB: Modifier abonnement
    API-->>Stripe: OK
```

---

## 5. Join Organization (request → approve)

### 5a. User sends join request

```mermaid
sequenceDiagram
    actor User
    participant API as Plateforme
    participant DB as Base de données

    Note over User,DB: ref : S'authentifier

    alt Email vérifié
        API->>DB: Vérifier statut
    else Non vérifié
        API-->>User: Vérifier email
    end

    User->>API: Demander adhésion
    API->>DB: Vérifier éligibilité
    alt Éligible
        API->>DB: Enregistrer demande
        API-->>User: Demande envoyée
    else Non éligible
        API-->>User: Erreur
    end
```

### 5b. Admin lists pending requests

```mermaid
sequenceDiagram
    actor Admin
    participant API as Plateforme
    participant DB as Base de données

    Note over Admin,DB: ref : S'authentifier

    Admin->>API: Lister demandes
    API->>DB: Vérifier permissions
    alt Autorisé
        API->>DB: Récupérer demandes
        API-->>Admin: Liste affichée
    else Non autorisé
        API-->>Admin: Refusé
    end
```

### 5c. Admin accepts or rejects

```mermaid
sequenceDiagram
    actor Admin
    participant API as Plateforme
    participant DB as Base de données

    Note over Admin,DB: ref : S'authentifier

    Admin->>API: Décider demande
    API->>DB: Vérifier permissions
    alt Acceptée
        API->>DB: Ajouter membre
        API-->>Admin: OK
    else Rejetée
        API->>DB: Supprimer demande
        API-->>Admin: OK
    else Non autorisé
        API-->>Admin: Refusé
    end
```

---

## 6. Team + Member Management

```mermaid
sequenceDiagram
    actor Admin
    actor Lead as Chef d'équipe
    participant API as Plateforme
    participant DB as Base de données

    Note over Admin,DB: ref : S'authentifier

    Admin->>API: Créer équipe
    API->>DB: Vérifier permissions
    alt Autorisé
        API->>DB: Enregistrer équipe
        API-->>Admin: Équipe créée
    else Non autorisé
        API-->>Admin: Refusé
    end

    Lead->>API: Gérer membres
    API->>DB: Vérifier permissions
    alt Autorisé
        API->>DB: Modifier membres
        API-->>Lead: OK
    else Non autorisé
        API-->>Lead: Refusé
    end
```

---

## 7. Channel Messaging (WebSocket)

```mermaid
sequenceDiagram
    actor UserA
    actor UserB
    participant WS as WebSocket Canal
    participant DB as Base de données
    participant Vec as Pinecone

    Note over UserA,DB: ref : S'authentifier

    UserA->>WS: Se connecter
    UserB->>WS: Se connecter
    WS-->>UserA: Connecté
    WS-->>UserB: Connecté

    loop Session active
        UserA->>WS: Envoyer message
        WS->>DB: Vérifier permissions
        WS->>DB: Enregistrer message
        WS->>Vec: Indexer message
        WS-->>UserB: Diffuser message
    end

    UserA->>WS: Déconnexion
    UserB->>WS: Déconnexion
```

---

## 8. File Upload + Indexing

```mermaid
sequenceDiagram
    actor User
    participant WS as WebSocket Canal
    participant API as Plateforme
    participant DB as Base de données
    participant Cloud as Cloudinary
    participant Vec as Pinecone

    Note over User,DB: ref : S'authentifier

    User->>WS: Téléverser fichier
    WS->>Cloud: Stocker fichier
    WS->>DB: Enregistrer fichier
    opt Fichier indexable
        WS->>Vec: Indexer contenu
    end
    WS-->>User: Fichier partagé

    User->>API: Télécharger fichier
    API->>DB: Vérifier permissions
    alt Autorisé
        API->>DB: Récupérer fichier
        API->>Cloud: Récupérer contenu
        API-->>User: Fichier
    else Non autorisé
        API-->>User: Refusé
    end
```

---

## 9. Task Lifecycle

### 9a. Manager creates task

```mermaid
sequenceDiagram
    actor Manager
    actor Assignee as Assigné
    participant API as Plateforme
    participant DB as Base de données
    participant Notif as Notifications

    Note over Manager,DB: ref : S'authentifier

    Manager->>API: Créer tâche
    API->>DB: Vérifier permissions
    alt Autorisé
        API->>DB: Enregistrer tâche
        API->>Notif: Notifier assigné
        Notif-->>Assignee: Tâche assignée
        API-->>Manager: Tâche créée
    else Non autorisé
        API-->>Manager: Refusé
    end
```

### 9b. Assignee submits for review

```mermaid
sequenceDiagram
    actor Manager
    actor Assignee as Assigné
    participant API as Plateforme
    participant DB as Base de données
    participant Notif as Notifications

    Note over Assignee,DB: ref : S'authentifier

    Assignee->>API: Soumettre tâche
    alt Transition valide
        API->>DB: Modifier statut
        API->>Notif: Notifier manager
        Notif-->>Manager: Tâche soumise
        API-->>Assignee: OK
    else Transition invalide
        API-->>Assignee: Erreur
    end
```

### 9c. Manager reviews (approve / reject)

```mermaid
sequenceDiagram
    actor Manager
    actor Assignee as Assigné
    participant API as Plateforme
    participant DB as Base de données
    participant Notif as Notifications

    Note over Manager,DB: ref : S'authentifier

    Manager->>API: Évaluer tâche
    API->>DB: Vérifier permissions
    alt Approuvée
        API->>DB: Modifier tâche
        API->>Notif: Notifier assigné
        Notif-->>Assignee: Tâche approuvée
        API-->>Manager: OK
    else Rejetée
        API->>DB: Modifier tâche
        API->>Notif: Notifier assigné
        Notif-->>Assignee: Tâche rejetée
        API-->>Manager: OK
    end
```

---

## 10. AI Assistant (RAG)

```mermaid
sequenceDiagram
    actor User
    participant API as Plateforme
    participant DB as Base de données
    participant Vec as Pinecone
    participant LLM

    Note over User,DB: ref : S'authentifier

    User->>API: Poser question
    API->>DB: Vérifier permissions
    alt Autorisé
        API->>Vec: Rechercher contexte
        Vec-->>API: Résultats
        API->>LLM: Demander réponse
        LLM-->>API: Réponse
        API-->>User: Afficher résultat
    else Non autorisé
        API-->>User: Refusé
    end
```

---

## 11. Direct Messages

```mermaid
sequenceDiagram
    actor UserA
    actor UserB
    participant WS as WebSocket DM
    participant API as Plateforme
    participant DB as Base de données

    Note over UserA,DB: ref : S'authentifier

    UserA->>WS: Se connecter
    UserB->>WS: Se connecter

    loop Session active
        UserA->>WS: Envoyer message
        WS->>DB: Vérifier blocage
        WS->>DB: Enregistrer message
        opt UserB en ligne
            WS-->>UserB: Diffuser message
        end
    end

    UserA->>API: Lister conversations
    API->>DB: Récupérer conversations
    API-->>UserA: Liste affichée

    UserA->>WS: Déconnexion
    UserB->>WS: Déconnexion
```

---

## 12. Presence WebSocket

```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend
    participant WS as WebSocket Présence
    participant DB as Base de données
    participant Friends as WebSocket Amis

    Note over User,DB: ref : S'authentifier

    User->>FE: Ouvrir application
    FE->>WS: Se connecter
    WS->>DB: Marquer en ligne
    WS->>Friends: Diffuser présence
    WS-->>FE: Liste amis en ligne

    loop Battement
        FE->>WS: Ping
        WS-->>FE: Pong
    end

    opt Changement statut
        User->>FE: Modifier statut
        FE->>WS: Mettre à jour
        WS->>DB: Enregistrer statut
        WS->>Friends: Diffuser statut
    end

    FE->>WS: Déconnexion
    alt Dernière session
        WS->>DB: Marquer hors ligne
        WS->>Friends: Diffuser hors ligne
    end
```
