# TeamNest — Spécification des besoins

## 1. Acteurs et besoins fonctionnels

### Visiteur
Le visiteur a la possibilité de :
- Consulter la page d'accueil de la plateforme
- S'inscrire avec une adresse e-mail et un mot de passe
- Vérifier son adresse e-mail via un code reçu par e-mail
- Se connecter à son compte
- Demander la réinitialisation de son mot de passe
- Recevoir un code de réinitialisation par e-mail

### Membre
Le membre a la possibilité de :
- Compléter son profil (avatar, pays, numéro de téléphone)
- Modifier son mot de passe
- Se déconnecter d'une session ou de tous ses appareils
- Définir son statut (en ligne, absent, ne pas déranger)
- Créer une organisation
- Rejoindre une organisation sur invitation
- Créer et gérer ses conversations directes (1:1)
- Créer un groupe de discussion et y ajouter des membres
- Envoyer, modifier et supprimer ses messages
- Joindre des fichiers (images, PDF, documents) à ses messages
- Rechercher des messages dans un canal ou une conversation
- Envoyer une demande d'ami
- Accepter ou refuser une demande d'ami
- Bloquer ou débloquer un utilisateur
- Recevoir des notifications en temps réel (mentions, DM, demandes d'ami, tâches)
- Marquer ses notifications comme lues
- Consulter et mettre à jour le statut des tâches qui lui sont assignées
- Joindre des fichiers à une tâche
- Poser des questions à l'assistant IA basé sur les documents de son organisation
- Effectuer une recherche transversale (utilisateurs, canaux, messages, fichiers)

### Administrateur d'équipe
L'administrateur d'équipe a la possibilité de :
- Créer une équipe au sein d'une organisation
- Ajouter des membres à une équipe
- Attribuer des permissions granulaires à chaque membre (créer des canaux, supprimer des messages, gérer les tâches, expulser, faire des annonces)
- Expulser un membre d'une équipe
- Créer, modifier et supprimer des canaux
- Épingler ou désépingler un message
- Créer des tâches avec date d'échéance et priorité
- Assigner une ou plusieurs personnes à une tâche
- Réviser (approuver ou rejeter) les tâches terminées
- Téléverser des documents (PDF) pour l'indexation par l'assistant IA

### Propriétaire d'organisation
Le propriétaire d'organisation a la possibilité de :
- Créer une organisation et en définir les paramètres
- Inviter de nouveaux membres
- Consulter et traiter les demandes d'adhésion en attente
- Accepter ou rejeter une demande d'adhésion
- Souscrire à un abonnement payant via Stripe Checkout
- Annuler son abonnement
- Consulter le journal d'audit des actions sensibles de l'organisation

### Système
Le système a la responsabilité de :
- Gérer les connexions WebSocket et la présence en ligne
- Diffuser les messages en temps réel aux destinataires connectés
- Envoyer les e-mails de vérification et de réinitialisation
- Stocker les fichiers téléversés sur Cloudinary
- Analyser les PDF et générer les embeddings dans Pinecone
- Interroger le modèle Groq pour les réponses de l'assistant IA
- Vérifier et traiter les webhooks Stripe (abonnement, annulation, échec de paiement)
- Enregistrer les actions sensibles dans le journal d'audit
- Faire pivoter les jetons de rafraîchissement à chaque appel `/refresh`

---

## 2. Besoins non fonctionnels

### Sécurité
- Mots de passe hachés avec bcrypt
- Jetons JWT signés (HS256) avec une durée de vie courte
- Jetons de rafraîchissement stockés hachés et renouvelés à chaque utilisation
- Cookies de rafraîchissement `HttpOnly`, `Secure` et `SameSite` en production
- Contrôle d'accès basé sur les rôles (RBAC) appliqué à chaque endpoint
- Connexions WebSocket protégées par un jeton JWT obligatoire

### Performance
- Latence de livraison des messages temps réel inférieure à 300 ms en local
- Pool de connexions à la base dimensionné pour la charge concurrente (`DB_POOL_SIZE=50`, overflow 100)

### Fiabilité
- Reconnexion gracieuse des WebSockets avec rechargement paginé de l'historique
- Webhooks Stripe idempotents et signature vérifiée
- Migrations de schéma versionnées via Alembic

### Maintenabilité
- Architecture en couches : `router → service → modèle` pour chaque domaine
- Routeurs minces (validation et dépendances d'authentification uniquement)
- Documentation OpenAPI auto-générée disponible sur `/docs` et `/redoc`

### Testabilité
- Suites pytest pour l'authentification, le CRUD, les amis/DM, les permissions, la présence et la recherche
- Tests exécutés sur une base de données isolée

### Utilisabilité
- Interface en thèmes clair et sombre
- Visite guidée d'intégration (driver.js) pour les nouveaux utilisateurs

### Portabilité
- Compatible PostgreSQL, MySQL et SQLite via SQLAlchemy

### Confidentialité
- Les réponses de l'assistant IA sont strictement limitées aux documents de l'organisation de l'utilisateur

### Observabilité
- Journal d'audit enregistrant l'acteur, l'action, la cible et les métadonnées pour les opérations sensibles
