import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, query, where, getDocs, addDoc, Timestamp, collection, increment } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { browserLocalPersistence, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, onAuthStateChanged, getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyCT4cB6eMOMlNxfrR-XFthOyppSwJU5WHU",
    authDomain: "stanjapap2.firebaseapp.com",
    projectId: "stanjapap2",
    appId: "1:310613716807:web:81a2a5d97356511b8aa662"
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);
const auth = getAuth();
auth.setPersistence(browserLocalPersistence);

export const getPrimaryAuth = () => new Promise((resolve) => onAuthStateChanged(auth, resolve));

export const SignIn = async (email, password) => signInWithEmailAndPassword(auth, email, password)
    .then(async (userCredential) => userCredential.user.emailVerified)
    .catch(() => false);

export const SignUp = async (email, password) => createUserWithEmailAndPassword(auth, email, password)
    .then(async (userCredential) => sendEmailVerification(userCredential.user).then(() => 1).catch(() => 2))
    .catch(() => 3);

export const getOneDoc = (collectionName, docId) => getDoc(doc(db, collectionName, docId)).then(doc => doc.exists() ? { id: doc.id, ...doc.data() } : null).catch(() => null);


// Setters
export const addNewDoc = (collectionName, data) => addDoc(collection(db, collectionName), data).then(doc => ({ id: doc.id, ...data })).catch(() => null);

export const setOneDoc = (collectionName, docId, data) => setDoc(doc(db, collectionName, docId), data, { merge: true }).then(() => data).catch(() => null);

export const incrementOneDocValue = async (collectionName, docId, field, value) => await setDoc(doc(db, collectionName, docId), { [field]: increment(value) }, { merge: true });


// Getters
export const getAllDocs = async (collectionName) => {
    const querySnapshot = await getDocs(collection(db, collectionName));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

const documentsMatch = (collectionName, criteria) => {
  const constraints = Object.entries(criteria).map(([field, value]) => where(field, "==", value));
   return getDocs(query(collection(db, collectionName), ...constraints)).then(snapshot => snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))).catch(() => null);
};


// Timers
export const now = () => Timestamp.now();
export const fromDate = (date) => Timestamp.fromDate(date);


// Custom functions
const normalizeMessage = (msg) => {
    return JSON.stringify({
        senderMail: msg.senderMail,
        receiverMail: msg.receiverMail,
        content: msg.content,
        read: msg.read ?? false,
        tag: msg.tag ?? "",
        timestamp: { seconds: msg.timestamp.seconds ?? msg.timestamp._seconds }
    });
}

const checkAuth = (token, email) => getOneDoc("users", email).then(doc => doc && doc.token === token).catch(() => false);

export const generateToken = () => {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let token = "";
    for (let i = 0; i < 32; i++)
        token += charset.charAt(Math.floor(Math.random() * charset.length));
    return token;
}

export const getFriends = async (email, token) => {
    if (!await checkAuth(token, email))
        return { status: 401 };

    const messagesSnapshot = (await documentsMatch("messages", { senderMail: email })).sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());
    const receivedSnapshot = (await documentsMatch("messages", { receiverMail: email })).sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());

    let conversations = {};
    
    const alreadyExists = (elt, list) =>{
        for (var e of list)
            if (normalizeMessage(e) === normalizeMessage(elt))
                return true;
        return false;
    }
    
    // Fonction pour ajouter un message à une conversation
    const addMessageToConversation = async (msg, id, isUnread) => {
        msg.id = id;
        const otherUser = msg.senderMail === email ? msg.receiverMail : msg.senderMail;
        if (!conversations[otherUser]) {
            const user = await getOneDoc("users", otherUser);
            const userData = user.data();
            conversations[otherUser] = { messages: [], lastMessage: null, unreadCount: 0, ppUrl: userData.ppUrl, pseudo: userData.pseudo };
        }
        if (!alreadyExists(msg, conversations[otherUser].messages)){
            conversations[otherUser].messages.push(msg);
            conversations[otherUser].lastMessage = { "seconds": msg.timestamp.seconds ?? msg.timestamp._seconds, "content": msg.content };    
            if (isUnread)
                conversations[otherUser].unreadCount++;
        }
    };
    
    try {
        // Parcourir les messages envoyés
        for (const doc of messagesSnapshot.docs)
            await addMessageToConversation(doc.data(), doc.id, false);
        // Parcourir les messages reçus
        for (const doc of receivedSnapshot.docs)
            await addMessageToConversation(doc.data(), doc.id, !doc.data().read);    
        return { conversations, status: 200};
    } catch { return { status: 500 }; }
}

export const sendMessage = async (senderMail, receiverMail, content, tag, token) => {
    if (!await checkAuth(token, email))
        return { status: 401 };
    
    const timestamp = now();
    
    return await addNewDoc("messages", {
        "senderMail": senderMail,
        "receiverMail": receiverMail,
        "content": content,
        "tag": tag ?? "",
        "read": false,
        "timestamp": timestamp
    });    
}

export const saveAlias = async (email, contact, alias, token) => {
    if (!await checkAuth(token, email))
        return { status: 401 };
    
    const user = await getOneDoc("users", email);
    if (!user)
        return { status: 404 };
    
    const aliases = user.aliases ?? {};
    aliases[contact] = alias;
    
    const result = await setOneDoc("users", email, { aliases });
    if (result)
        return { aliases: result, status: 200};
    else
        return { status: 500 };
}


export const getProfile = async (email) =>{
    const user = await getOneDoc("users", email);
    if (!user)
        return { status: 404 };
    
    const profile = { "ppUrl": user.ppUrl, "pseudo": user.pseudo, "actu": user.actu };
    if (user.showEmail)
        profile["email"] = email;
    
    return { status: 200, profile };
}

export const updateProfile = async (email, pseudo, actu, showEmail, fileBase64, token) => {
    if (!await checkAuth(token, email))
        return { status: 401 };
    
    const user = await getOneDoc("users", email);
    if (!user)
        return { status: 404 };
    
    const updateData = { pseudo, actu, showEmail: showEmail || false };
    
    if (fileBase64)
        updateData.ppUrl = `data:image/jpeg;base64,${fileBase64}`;
    
    return await setOneDoc("users", email, updateData);
};

export const deleteMessage = async (email, id, token) => {
    if (!await checkAuth(token, email))
        return { status: 401 };
    
    const msg = await getOneDoc("messages", id);
    if (!msg)
        return { status: 404 };
    
    if (msg.senderMail !== email){
        if (msg.receiverMail !== email)
            return { status: 401 };

        const user = await getOneDoc("users", email);
        const deletedmessages = user.deletedmessages || [];
        deletedmessages.push(id);
        return await setOneDoc("users", email, { deletedmessages });
    }
    else
        return await setOneDoc("messages", id, { "content": `<p class="deletedmessage">Ce message a été supprimé</p>`, "tag": "" });    
}
