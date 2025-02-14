const {onRequest} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();
const bucket = admin.storage().bucket();
const db = admin.firestore();

function generateToken() {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let token = "";
    for (let i = 0; i < 32; i++)
        token += charset.charAt(Math.floor(Math.random() * charset.length));
    return token;
}
async function checkAuth(req, email) {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return false;
        }
    
        const idToken = authHeader.split("Bearer ")[1];
    
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
function deepEqual(obj1, obj2) {
    if (typeof obj1 !== "object" || typeof obj2 !== "object" || obj1 === null || obj2 === null)
        return obj1 === obj2;

    const normalizeMessage = (msg) => {
        return JSON.stringify({
            senderMail: msg.senderMail,
            receiverMail: msg.receiverMail,
            content: msg.content,
            read: msg.read ?? false,
            tag: msg.tag ?? "",
            timestamp: {
                seconds: msg.timestamp.seconds ?? msg.timestamp._seconds,
            }
        });
    }
    
    return normalizeMessage(obj1) === normalizeMessage(obj2);
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
            aliases: {},
            ppUrl: "https://as2.ftcdn.net/v2/jpg/01/99/45/45/1000_F_199454533_GIBKQvbUBlu0hl5xhn64pJOHp1nn5W2C.jpg",
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

    const {email} = req.body;
    if (!email)
        return res.status(400).json({ "error": "Missing required fields in request body" });

    try {
        const userRef = db.collection("users").doc(email);
        const user = await userRef.get();
        if (!user.exists)
            return res.status(404).json({ "error": "User doesn't exist" });

        const token = generateToken();
        await userRef.update({ "token": token });  
        
        res.status(200).json({
            "userData": { "pseudo": user.data().pseudo, "aliases": user.data().aliases, "token": token }
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ "error": error });
    }
});

exports.getFriends = onRequest(async (req, res) => {
    res.set("Access-Control-Allow-Origin", "https://stanjapap.web.app");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS")
        return res.status(204).send("");
    else if (req.method !== "POST")
        return res.status(405).json({ "error": "Méthode non autorisée" });
    
    const { email } = req.body;
    if (!email)
        return res.status(400).json({ error: "Email is required" });

    if (!await checkAuth(req, email))
        return res.status(401).json({ error: "Unauthenticated" });

    try {
        const messagesSnapshot = await db.collection("messages").where("senderMail", "==", email).orderBy("timestamp", "desc").get();
        const receivedSnapshot = await db.collection("messages").where("receiverMail", "==", email).orderBy("timestamp", "desc").get();
        let conversations = {};

        const alreadyExists = (elt, list) =>{
            for (var e of list)
                if (deepEqual(e, elt))
                    return true;
            return false;
        }

        // Fonction pour ajouter un message à une conversation
        const addMessageToConversation = async (msg, isUnread) => {
            const otherUser = msg.senderMail === email ? msg.receiverMail : msg.senderMail;
            if (!conversations[otherUser]) {
                const user = await db.collection("users").doc(otherUser).get();
                conversations[otherUser] = { messages: [], lastMessage: null, unreadCount: 0, ppUrl: user.data().ppUrl, pseudo: user.data().pseudo };
            }
            if (!alreadyExists(msg, conversations[otherUser].messages)){
                conversations[otherUser].messages.push(msg);
                conversations[otherUser].lastMessage = { "seconds": msg.timestamp.seconds ?? msg.timestamp._seconds, "content": msg.content };    
                if (isUnread) {
                    conversations[otherUser].unreadCount++;
                }
            }
        };

        // Parcourir les messages envoyés
        for (const doc of messagesSnapshot.docs)
            await addMessageToConversation(doc.data(), false);
        // Parcourir les messages reçus
        for (const doc of receivedSnapshot.docs)
            await addMessageToConversation(doc.data(), !doc.data().read);

        return res.status(200).json({ "conversations": conversations});
    } catch (error) {
        console.error("Error fetching messages:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

exports.sendMessage = onRequest(async (req, res) => {
    res.set("Access-Control-Allow-Origin", "https://stanjapap.web.app");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS")
        return res.status(204).send("");
    else if (req.method !== "POST")
        return res.status(405).json({ "error": "Méthode non autorisée" });
    
    const { senderMail, receiverMail, content, tag } = req.body;
    if (!senderMail || !receiverMail || !content)
        return res.status(400).json({ error: "Bad Request" });

    if (!await checkAuth(req, senderMail))
        return res.status(401).json({ error: "Unauthenticated" });

    const timestamp = admin.firestore.Timestamp.now();

    const message = {
        "senderMail": senderMail,
        "receiverMail": receiverMail,
        "content": content,
        "tag": tag ?? "",
        "read": false,  // Par défaut, le message n'est pas lu
        "timestamp": timestamp
    };

    try {
        await db.collection("messages").add(message);
        return res.status(200).json({ "message": message });
    } catch (error) {
        console.error("Erreur lors de l'envoi du message:", error);
        return res.status(500).send("Internal error");
    }
});
