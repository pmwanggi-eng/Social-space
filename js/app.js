
// =====================================
// SOCIAL SPACE AUTHENTICATION
// =====================================

const supabaseClient = window.supabase.createClient(
  SOCIAL_CONFIG.supabaseUrl,
  SOCIAL_CONFIG.supabaseAnonKey
);

const $ = id => document.getElementById(id);

function showAuthMessage(message, type = "error") {
  const box = $("authMessage");
  box.textContent = message;
  box.className = "auth-message " + type;
}

function switchAuth(mode) {
  $("loginForm").classList.toggle("hidden", mode !== "login");
  $("signupForm").classList.toggle("hidden", mode !== "signup");
  $("authMessage").textContent = "";
  $("authMessage").className = "auth-message";
}

$("showSignup").addEventListener("click", e => {
  e.preventDefault();
  switchAuth("signup");
});

$("showLogin").addEventListener("click", e => {
  e.preventDefault();
  switchAuth("login");
});

// =====================================
// REGISTER ACCOUNT
// =====================================

$("signupFormElement").addEventListener("submit", async e => {
  e.preventDefault();

  const name = $("signupName").value.trim();
  const username = $("signupUsername").value.trim().toLowerCase();
  const email = $("signupEmail").value.trim();
  const password = $("signupPassword").value;
  const confirm = $("confirmPassword").value;

  if (name.length < 2) {
    return showAuthMessage("Please enter your full name.");
  }

  if (!/^[a-z0-9_]{3,24}$/.test(username)) {
    return showAuthMessage(
      "Username must have 3-24 letters, numbers or underscores."
    );
  }

  if (password.length < 8) {
    return showAuthMessage("Password must contain at least 8 characters.");
  }

  if (password !== confirm) {
    return showAuthMessage("Your passwords do not match.");
  }

  const button = $("signupBtn");
  button.disabled = true;
  button.textContent = "Creating account...";

  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          display_name: name
        }
      }
    });

    if (error) throw error;

    if (data.session) {
      showAuthMessage("Account created successfully!", "success");
      await loadUser(data.session.user);
    } else {
      showAuthMessage(
        "Account created! Check your email and confirm your address before logging in.",
        "success"
      );
      $("signupFormElement").reset();
      switchAuth("login");
      showAuthMessage(
        "Please verify your email, then log in.",
        "success"
      );
    }

  } catch (error) {
    showAuthMessage(error.message);
  } finally {
    button.disabled = false;
    button.textContent = "Create My Account";
  }
});

// =====================================
// LOGIN
// =====================================

$("loginFormElement").addEventListener("submit", async e => {
  e.preventDefault();

  const email = $("loginEmail").value.trim();
  const password = $("loginPassword").value;

  const button = $("loginBtn");
  button.disabled = true;
  button.textContent = "Logging in...";

  try {
    const { data, error } =
      await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

    if (error) throw error;

    await loadUser(data.user);

  } catch (error) {
    showAuthMessage(error.message);
  } finally {
    button.disabled = false;
    button.textContent = "Log In";
  }
});

// =====================================
// LOAD USER PROFILE
// =====================================

async function loadUser(user) {
  if (!user) return;

  const { data: profile, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    showAuthMessage(error.message);
    return;
  }

  if (!profile) {
    showAuthMessage("Your profile is not ready. Please contact support.");
    return;
  }

  const name = profile.display_name || "Social Space Member";
  const initial = name.charAt(0).toUpperCase();

  $("welcomeName").textContent = "Welcome, " + name + " 👋";
  $("profileName").textContent = name;
  $("profileUsername").textContent = "@" + profile.username;
  $("profileEmail").textContent = user.email;
  $("headerAvatar").textContent = initial;
  $("composerAvatar").textContent = initial;
  $("profileAvatar").textContent = initial;

  $("authScreen").classList.add("hidden");
  $("appShell").classList.remove("hidden");

  await loadPosts();
}

// =====================================
// LOGOUT
// =====================================

async function logout() {
  if (!confirm("Are you sure you want to log out?")) return;

  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    showMessage(error.message);
    return;
  }

  $("appShell").classList.add("hidden");
  $("authScreen").classList.remove("hidden");
  switchAuth("login");
  showMessage("You have logged out successfully.");
}

// =====================================
// SESSION RESTORE
// =====================================

async function initializeApp() {
  const { data, error } = await supabaseClient.auth.getSession();

  if (error) {
    showAuthMessage(error.message);
    return;
  }

  if (data.session) {
    await loadUser(data.session.user);
  } else {
    $("authScreen").classList.remove("hidden");
    $("appShell").classList.add("hidden");
  }
}

supabaseClient.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_OUT") {
    $("appShell").classList.add("hidden");
    $("authScreen").classList.remove("hidden");
  }
});

initializeApp();

// =====================================
// NAVIGATION
// =====================================

function navigate(pageId, button) {
  document.querySelectorAll(".page").forEach(p =>
    p.classList.remove("active")
  );

  $(pageId).classList.add("active");

  document.querySelectorAll(".nav-item").forEach(b =>
    b.classList.remove("active")
  );

  if (button) button.classList.add("active");

  window.scrollTo(0, 0);
}

function showProfile() {
  navigate("profilePage", document.querySelectorAll(".nav-item")[4]);
}

function showNotifications() {
  navigate("notificationsPage", null);
}

function showSearch() {
  navigate("searchPage", null);
}

function focusComposer() {
  navigate("homePage", document.querySelector(".nav-item"));
  setTimeout(() => $("postText").focus(), 100);
}

// =====================================
// NOTIFICATIONS
// =====================================

function showMessage(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.style.display = "block";

  clearTimeout(window.toastTimer);

  window.toastTimer = setTimeout(() => {
    toast.style.display = "none";
  }, 3000);
}

// =====================================
// PROFILE EDITING
// =====================================

async function editProfile() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabaseClient
    .from("profiles")
    .select("display_name,bio")
    .eq("id", user.id)
    .single();

  const name = prompt("Enter your display name:", profile?.display_name || "");
  if (name === null) return;

  const bio = prompt("Enter your biography:", profile?.bio || "");
  if (bio === null) return;

  if (name.trim().length < 2 || name.trim().length > 60) {
    return showMessage("Name must contain 2-60 characters.");
  }

  if (bio.length > 500) {
    return showMessage("Biography must be 500 characters or less.");
  }

  const { error } = await supabaseClient
    .from("profiles")
    .update({
      display_name: name.trim(),
      bio: bio.trim()
    })
    .eq("id", user.id);

  if (error) return showMessage(error.message);

  await loadUser(user);
  showMessage("Profile updated!");
}

// =====================================
// POSTS
// =====================================

async function createPost() {
  const content = $("postText").value.trim();

  if (!content) return showMessage("Write something first.");

  if (content.length > 10000) {
    return showMessage("Your post is too long.");
  }

  const { data: { user } } = await supabaseClient.auth.getUser();

  if (!user) return showMessage("Please log in.");

  const { error } = await supabaseClient
    .from("posts")
    .insert({
      user_id: user.id,
      content,
      visibility: "public"
    });

  if (error) return showMessage(error.message);

  $("postText").value = "";
  await loadPosts();
  showMessage("Your post has been published!");
}

async function loadPosts() {
  const feed = $("feed");
  feed.innerHTML = '<div class="empty-state">Loading posts...</div>';

  const { data, error } = await supabaseClient
    .from("posts")
    .select(`
      id,
      user_id,
      content,
      created_at,
      profiles (
        display_name,
        username
      ),
      likes (id),
      comments (id)
    `)
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    feed.textContent = "Could not load posts: " + error.message;
    return;
  }

  if (!data.length) {
    feed.innerHTML = '<div class="empty-state">No posts yet. Be the first to share something!</div>';
    return;
  }

  feed.replaceChildren();

  data.forEach(post => {
    const article = document.createElement("article");
    article.className = "post";

    const profile = post.profiles || {};
    const name = profile.display_name || "Social Space Member";
    const initial = name.charAt(0).toUpperCase();
    const likes = post.likes?.length || 0;
    const comments = post.comments?.length || 0;

    const header = document.createElement("div");
    header.className = "post-header";

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = initial;

    const details = document.createElement("div");
    details.className = "post-user";

    const strong = document.createElement("strong");
    strong.textContent = name;

    const small = document.createElement("small");
    small.textContent = new Date(post.created_at).toLocaleString();

    details.append(strong, small);
    header.append(avatar, details);

    const content = document.createElement("p");
    content.textContent = post.content;

    const stats = document.createElement("div");
    stats.className = "post-stats";

    const likesCount = document.createElement("span");
    likesCount.className = "likes-count";
    likesCount.textContent = likes + " likes";

    const commentsCount = document.createElement("span");
    commentsCount.textContent = comments + " comments";

    stats.append(likesCount, commentsCount);

    const actions = document.createElement("div");
    actions.className = "post-actions";

    const like = document.createElement("button");
    like.textContent = "♡ Like";
    like.onclick = () => toggleLike(post.id, like, likesCount);

    const comment = document.createElement("button");
    comment.textContent = "▢ Comment";
    comment.onclick = () => addComment(post.id);

    const share = document.createElement("button");
    share.textContent = "↗ Share";
    share.onclick = () => sharePost(post.id);

    actions.append(like, comment, share);
    article.append(header, content, stats, actions);
    feed.appendChild(article);
  });
}

// =====================================
// REAL POST LIKES
// =====================================

async function toggleLike(postId, button, countElement) {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return;

  const { data: existing, error: findError } = await supabaseClient
    .from("likes")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (findError) return showMessage(findError.message);

  if (existing) {
    const { error } = await supabaseClient
      .from("likes")
      .delete()
      .eq("id", existing.id);

    if (error) return showMessage(error.message);
  } else {
    const { error } = await supabaseClient
      .from("likes")
      .insert({ post_id: postId, user_id: user.id });

    if (error) return showMessage(error.message);
  }

  await loadPosts();
}

// =====================================
// REAL COMMENTS
// =====================================

async function addComment(postId) {
  const content = prompt("Write your comment:");
  if (!content?.trim()) return;

  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return;

  const { error } = await supabaseClient
    .from("comments")
    .insert({
      post_id: postId,
      user_id: user.id,
      content: content.trim()
    });

  if (error) return showMessage(error.message);

  await loadPosts();
  showMessage("Comment added!");
}

// =====================================
// SHARE POSTS
// =====================================

async function sharePost(postId) {
  const url = location.origin + location.pathname + "?post=" + postId;

  if (navigator.share) {
    try {
      await navigator.share({
        title: "SOCIAL SPACE",
        text: "Check out this post on Social Space!",
        url
      });
    } catch (error) {}
  } else {
    try {
      await navigator.clipboard.writeText(url);
      showMessage("Post link copied!");
    } catch (error) {
      showMessage("Sharing is not available here.");
    }
  }
}

// =====================================
// SOCIAL SPACE PROFILE IMAGE UPLOAD
// =====================================

async function uploadProfileImage(type, file) {
  if (!file) return;

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

  if (!allowedTypes.includes(file.type)) {
    showMessage('Please select a JPG, PNG or WEBP image.');
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    showMessage('Image is too large. Maximum size is 5MB.');
    return;
  }

  try {
    showMessage('Uploading image...');

    const { data: userData, error: userError } =
      await supabaseClient.auth.getUser();

    if (userError) throw userError;

    const user = userData.user;
    if (!user) throw new Error('Please log in again.');

    const extension = file.type.split('/')[1].replace('jpeg', 'jpg');
    const filePath = `${user.id}/${type}-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabaseClient.storage
      .from('profile-media')
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type,
        cacheControl: '3600'
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabaseClient.storage
      .from('profile-media')
      .getPublicUrl(filePath);

    const column = type === 'avatar' ? 'avatar_url' : 'cover_url';

    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({ [column]: urlData.publicUrl })
      .eq('id', user.id);

    if (updateError) throw updateError;

    await loadUser(user);
    showMessage('Image uploaded successfully!');

  } catch (error) {
    console.error('SOCIAL SPACE IMAGE UPLOAD ERROR:', error);
    showMessage('Upload failed: ' + (error.message || 'Unknown error'));
  }
}

// Connect profile and cover photo buttons
document.addEventListener('DOMContentLoaded', () => {
  const avatarInput = document.getElementById('avatarInput');
  const coverInput = document.getElementById('coverInput');

  if (avatarInput) {
    avatarInput.addEventListener('change', event => {
      uploadProfileImage('avatar', event.target.files[0]);
      event.target.value = '';
    });
  }

  if (coverInput) {
    coverInput.addEventListener('change', event => {
      uploadProfileImage('cover', event.target.files[0]);
      event.target.value = '';
    });
  }
});
