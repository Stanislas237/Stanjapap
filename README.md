# Stanjapap
 Stanjapap est une application de messagerie instantanée développée en utilisant HTML, CSS, JavaScript et Firebase. 
 Cette application permet aux utilisateurs de discuter en temps réel avec leurs amis et leur famille.

# Fonctionnalités

- **Inscription et Connexion** : Les utilisateurs peuvent créer un compte et se connecter pour accéder à la messagerie.
- **Messagerie en Temps Réel** : Les utilisateurs peuvent envoyer et recevoir des messages instantanément.
- **Notifications** : Les utilisateurs reçoivent des notifications pour les nouveaux messages.
- **Interface Utilisateur Responsive** : L'application est compatible avec différents appareils et tailles d'écran.

# Prérequis

- **Navigateur** : Un navigateur moderne comme Chrome, Firefox ou Edge.
- **Firebase** : Avoir un compte Firebase pour configurer l'authentification et la base de données en temps réel.

# Installation

1. Clonez ce dépôt sur votre machine locale :
    ```bash
    git clone https://github.com/Stanislas237/Stanjapap.git
    ```
2. Ouvrez le dossier du projet :
    ```bash
    cd Stanjapap
    ```
3. Ouvrez le fichier `index.html` dans votre navigateur pour lancer l'application.

# Configuration

1. Créez un projet Firebase et configurez l'authentification ainsi que la base de données en temps réel.
2. Dans la Firestore Database, créez les collections **users** et **messages**.
3. Remplacez les informations de configuration Firebase dans le fichier `config.js` par celles de votre projet.

# Hébergement

La version actuelle de l'application est hébergée à cette adresse : [stanjapap.web.app](https://stanjapap.web.app)

## Usage

1. Ouvrez l'application et inscrivez-vous avec un nouvel utilisateur.
2. Une fois connecté, commencez à envoyer et recevoir des messages en temps réel avec vos amis.
3. Vous pouvez vous envoyer des messages à vous-même en suivant cette procédure :
   - Ouvrir votre profil
   - Récupérer le lien public vers votre profil
   - Ouvrir ce lien
   - Cliquer sur "lui écrire"
4. Pour contacter d'autres utilisateurs, c'est la même procédure, vous devez avoir le lien public de leur profil.

# Contribuer

Les contributions sont les bienvenues ! Si vous avez des idées de nouvelles fonctionnalités ou des améliorations, n'hésitez pas à ouvrir une `issue` ou à créer une `pull request`.

# Auteurs

- **Stanislas237** - *Développeur principal* - [Stanislas237](https://github.com/Stanislas237)

# Licence

Ce projet est sous licence MIT - voir le fichier [LICENSE](LICENSE) pour plus de détails.
