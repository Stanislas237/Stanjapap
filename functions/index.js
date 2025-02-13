const {onRequest} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();
const bucket = admin.storage().bucket();
const db = admin.firestore();
const messaging = admin.messaging();

function generateToken() {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let token = "";
    for (let i = 0; i < 32; i++)
        token += charset.charAt(Math.floor(Math.random() * charset.length));
    return token;
}
async function checkAuth(req, email) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return false;
    }

    const idToken = authHeader.split("Bearer ")[1];

    try {
        const userDoc = await db.collection("users").doc(email).get();
        if (!userDoc.exists) {
            return false;
        }

        if (userDoc.data().token === idToken)
            return true;
        else
            return false;
    } catch (error) {
        return false;
    }
}

exports.addUser = onRequest(async (req, res) => {
    res.set("Access-Control-Allow-Origin", "https://stanjapap.web.app");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS")
        return res.status(204).send("");
    else if (req.method !== "POST")
        return res.status(405).json({ "error": "Méthode non autorisée" });

    const {email, password, name, pseudo} = req.body;
    if (!email || !password || !name || !pseudo)
        return res.status(400).json({ "error": "Missing required fields in request body" });

    try {
        const userRef = db.collection("users").doc(email);
        if ((await userRef.get()).exists)
            return res.status(409).json({ "error": "User already exists" });

        userRef.set({
            name,
            pseudo,
            aliases: [],
            registerDate: admin.firestore.FieldValue.serverTimestamp()
        });
        
        res.status(200).json({ "message": "En attente de vérification" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ "error": error });
    }
});

exports.getUser = onRequest(async (req, res) => {
    res.set("Access-Control-Allow-Origin", "https://stanjapap.web.app");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS")
        return res.status(204).send("");
    else if (req.method !== "POST")
        return res.status(405).json({ "error": "Méthode non autorisée" });

    const {email, fcmToken} = req.body;
    if (!email)
        return res.status(400).json({ "error": "Missing required fields in request body" });

    try {
        const userRef = db.collection("users").doc(email);
        const user = await userRef.get();
        if (!user.exists)
            return res.status(404).json({ "error": "User doesn't exist" });

        const token = generateToken();
        await userRef.update({ "fcmToken": fcmToken ?? null, "token": token });  
        
        res.status(200).json({
            "userData": { "pseudo": user.data().pseudo, "aliases": user.data().aliases, "token": token }
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ "error": error });
    }
});

exports.readMessages = onRequest(async (req, res) => {
    res.set("Access-Control-Allow-Origin", "https://stanjapap.web.app");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS")
        return res.status(204).send("");
    else if (req.method !== "POST")
        return res.status(405).json({ "error": "Méthode non autorisée" });

    const { email, contact } = req.body;

    if (!checkAuth(req, email))
        return res.status(401).json({ "error": "Unauthenticated" });

    try {
        db.collection("messages").where("receiverMail", "==", email).where("senderMail", "==", contact)
        .where("read", "==", false).get().then(snapshot => {
            snapshot.forEach(doc => {
                doc.ref.update({ read: true });
            });
        });
        console.log("Messages lus");
        return res.status(200).send("");
    } catch (error) {
        console.error("Error fetching messages:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

exports.getFriends = onRequest(async (req, res) => {
    res.set("Access-Control-Allow-Origin", "https://stanjapap.web.app");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS")
        return res.status(204).send("");
    else if (req.method !== "POST")
        return res.status(405).json({ "error": "Méthode non autorisée" });
    
    const { email } = req.body;
    if (!email)
        return res.status(400).json({ error: "Email is required" });

    if (!checkAuth(req, email))
        return res.status(401).json({ error: "Unauthenticated" });

    try {
        const messagesSnapshot = await db.collection("messages").where("senderMail", "==", email).orderBy("timestamp", "desc").get();
        const receivedSnapshot = await db.collection("messages").where("receiverMail", "==", email).orderBy("timestamp", "desc").get();
        let conversations = {};

        // Fonction pour ajouter un message à une conversation
        const addMessageToConversation = (msg, isUnread) => {
            const otherUser = msg.senderMail === email ? msg.receiverMail : msg.senderMail;
            if (!conversations[otherUser]) {
                conversations[otherUser] = { messages: [], lastMessage: msg.timestamp, unreadCount: 0 };
            }
            conversations[otherUser].messages.push(msg);
            conversations[otherUser].lastMessage = msg.timestamp;

            if (isUnread) {
                conversations[otherUser].unreadCount++;
            }
        };

        // Parcourir les messages envoyés
        messagesSnapshot.forEach(doc => {
            addMessageToConversation(doc.data(), false);
        });

        // Parcourir les messages reçus
        receivedSnapshot.forEach(doc => {
            addMessageToConversation(doc.data(), !doc.data().read);
        });

        // Trier les conversations par date du dernier message
        let sortedConversations = Object.entries(conversations)
        .sort((a, b) => b[1].lastMessage - a[1].lastMessage)
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

        return res.status(200).json({ "conversations": sortedConversations });
    } catch (error) {
        console.error("Error fetching messages:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});