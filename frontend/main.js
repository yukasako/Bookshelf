//////////////////// Global Variables ////////////////////
let userDiv = document.querySelector("#users");
let bookDiv = document.querySelector("#books");
let header = document.querySelector("#header");

//////////////////// Functions ////////////////////

////// 1, For Public User //////
const renderLoginPage = () => {
  userDiv.innerHTML = `
    <input type="text" id="username" placeholder="Username" />
    <input type="text" id="email" placeholder="E-mail*(Registration)" />
    <input type="password" id="password" placeholder="Password" />
    <div class="login">
    <button id="loginBtn" onclick="login()">Login</button>
    <button id="registerBtn" onclick="registerUser()">Register</button>
    </div>
    `;
};
const renderBooks = async () => {
  bookDiv.innerHTML = "";
  let response = await axios.get("http://localhost:1337/api/books?populate=*");
  let books = response.data.data;

  books.forEach((book) => {
    let bookCard = document.createElement("article");
    bookCard.classList = "bookCard";

    // Ratingの平均値を出す
    let totalRating = 0;
    let reviewCount = 0;
    let reviews = book.attributes.ratings.data;
    reviews.forEach((review) => {
      let rating = review.attributes.rating;
      totalRating += rating;
      reviewCount++;
    });
    let averageScore = Math.round((totalRating / reviewCount) * 10) / 10;

    //DOMに書き出し
    let bookImage = document.createElement("img");
    bookImage.src = `http://localhost:1337${book.attributes.image.data[0].attributes.url}`;

    let bookDescription = document.createElement("div");
    bookDescription.innerHTML = `
        <p>Title: ${book.attributes.title}</p>
        <p>Author: ${book.attributes.author}</p>
        <p>Pages: ${book.attributes.page}</p>
        <p>Rating Average: ${averageScore}</p>
      `;

    bookCard.append(bookImage, bookDescription);
    bookDiv.append(bookCard);
  });
};
// Login Logout
const registerUser = async () => {
  let username = document.querySelector("#username");
  let email = document.querySelector("#email");
  let password = document.querySelector("#password");

  // Post to api
  try {
    let response = await axios.post(
      "http://localhost:1337/api/auth/local/register",
      {
        username: username.value,
        email: email.value,
        password: password.value,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    console.log(response.data);
    let registeredMessage = document.createElement("p");
    registeredMessage.innerHTML = `${username.value} has registered.`;
    userDiv.append(registeredMessage);
  } catch {
    if (!username.value || !email.value || !password.value) {
      alert("Missing information. Fill in all the inputs.");
    } else {
      alert(
        "Registration failed. Password must contain uppercase letters, lowercase letters, and numbers."
      );
    }
  }
};
const login = async () => {
  let username = document.querySelector("#username");
  let password = document.querySelector("#password");
  try {
    let response = await axios.post("http://localhost:1337/api/auth/local/", {
      identifier: username.value,
      password: password.value,
    });
    sessionStorage.setItem("token", response.data.jwt);
    sessionStorage.setItem("user", JSON.stringify(response.data.user));
    renderProfile();
    renderLoginBooks();
  } catch {
    alert("Invalid user. Register user or Try another.");
    username.value = "";
    password.value = "";
  }
};
const logout = () => {
  sessionStorage.clear();
  renderLoginPage();
  renderBooks();
  header.children[1].remove();
};

/////// 2, For Authenticated User //////
//// 2-1, Render Profile Page
const renderProfile = async () => {
  userDiv.innerHTML = "";
  let user = JSON.parse(sessionStorage.getItem("user"));
  let userData = await axios.get(
    `http://localhost:1337/api/users/${user.id}?populate=*`
  );

  /// Profile Div ///
  let profileDiv = document.createElement("div");
  profileDiv.id = "profile";
  profileDiv.innerHTML = `
        <button id="logout" onclick="logout()">Logout</button>
    `;
  if (header.childElementCount < 2) {
    header.append(profileDiv);
  }

  let loginMessage = document.createElement("h2");
  loginMessage.innerText = `Welcome ${user.username}`;
  userDiv.append(loginMessage);

  // Color //
  await renderColors(profileDiv);
  await colorSelect();

  //// Book Lists ////
  let bookLists = document.createElement("div");
  userDiv.append(bookLists);

  //////// Render Reading List ////////
  let readingList = userData.data.reading_lists;
  let readingUl = document.createElement("ul");
  renderReadingList(user.id, readingList, readingUl);

  let readingH3 = document.createElement("h3");
  readingH3.innerHTML = `Book to Read`;

  // Sort ReadingList
  let sortReadingSelect = document.createElement("select");
  sortReadingSelect.innerHTML = `
      <option value="">Sort</option>
      <option value="title">Title</option>
      <option value="author">Author</option>
      <option value="page">Page</option>
    `;
  // Sortは破壊的処理なのでコピーを作成し、ソートしてDOMに書き出す。
  let sortReadingList = readingList.slice();
  sortReadingSelect.addEventListener("change", () => {
    sortList(sortReadingList, sortReadingSelect.value);
    renderReadingList(user.id, sortReadingList, readingUl);
  });

  let h3AndSort = document.createElement("div");
  h3AndSort.classList = "h3AndSort";
  h3AndSort.append(readingH3, sortReadingSelect);
  let readingDiv = document.createElement("div");
  readingDiv.append(h3AndSort, readingUl);
  readingDiv.classList = "list";
  bookLists.append(readingDiv);

  ///////// Render Reviewed List ////////
  // Data
  let ratedID = userData.data.ratings.map((rating) => {
    return rating.id;
  });

  let reviewList = [];
  await Promise.all(
    ratedID.map(async (id) => {
      let rating = await axios.get(
        `http://localhost:1337/api/ratings/${id}?populate=*`
      );
      reviewList.push(rating.data.data);
    })
  );

  // DOM
  let reviewUl = document.createElement("ul");
  renderReviewList(reviewList, reviewUl);

  // Sort ReadingList
  let sortReviewSelect = document.createElement("select");
  sortReviewSelect.innerHTML = `
        <option value="">Sort</option>
        <option value="title">Title</option>
        <option value="author">Author</option>
        <option value="rating">Your rating</option>
      `;
  // Sortは破壊的処理なのでコピーを作成し、ソートしてDOMに書き出す。
  let sortReviewList = reviewList.slice();
  sortReviewSelect.addEventListener("change", () => {
    sortRatedList(sortReviewList, sortReviewSelect.value);
    renderReviewList(sortReviewList, reviewUl);
  });

  let reviewH3 = document.createElement("h3");
  reviewH3.innerHTML = `Reviewed Book`;

  let h3AndSort2 = document.createElement("div");
  h3AndSort2.classList = "h3AndSort";
  h3AndSort2.append(reviewH3, sortReviewSelect);
  let reviewDiv = document.createElement("div");
  reviewDiv.append(h3AndSort2, reviewUl);
  reviewDiv.classList = "list";
  bookLists.append(reviewDiv);
};
// 2-1-1, Color Theme
const renderColors = async (DOM) => {
  let response = await axios.get(`http://localhost:1337/api/colors`, {
    headers: {
      Authorization: `Bearer ${sessionStorage.getItem("token")}`,
    },
  });
  let colors = response.data.data;

  // Render Color Options
  let selectColors = document.createElement("select");
  selectColors.id = "colorSelect";
  let defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.innerText = "Choose color theme";
  defaultOption.selected = "selected";
  selectColors.append(defaultOption);
  colors.forEach((color) => {
    let colorOption = document.createElement("option");
    colorOption.value = color.id;
    colorOption.innerText = color.attributes.theme;
    selectColors.append(colorOption);
  });
  DOM.prepend(selectColors);
};
const colorSelect = async () => {
  let selectedColors = document.querySelector("#colorSelect");
  selectedColors.addEventListener("change", async (event) => {
    let selectedValue = event.target.value;
    let response = await axios.get(
      `http://localhost:1337/api/colors/${selectedValue}`,
      {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("token")}`,
        },
      }
    );
    let selectedColor = response.data.data;
    document.body.style.background = selectedColor.attributes.background;
  });
};
// 2-1-2, Render Lists
const renderReadingList = (userID, arr, location) => {
  location.innerHTML = "";
  arr.forEach((book) => {
    let aBook = document.createElement("li");
    aBook.innerHTML = `${book.title} / ${book.author} / ${book.page}P`;

    // Delete from Reading list
    let deleteBtn = document.createElement("button");
    deleteBtn.innerHTML = "Delete";
    deleteBtn.addEventListener("click", async () => {
      // 指定したBookをReadingListから削除
      let updatedReadingList = arr.filter(
        (updateBook) => updateBook.id !== book.id
      );

      // ReadingListを更新
      await axios.put(
        `http://localhost:1337/api/users/${userID}`,
        {
          reading_lists: updatedReadingList,
        },
        {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem("token")}`,
          },
        }
      );
      await renderProfile();
      await renderLoginBooks();
    });

    aBook.append(deleteBtn);
    location.append(aBook);
  });
};
const renderReviewList = (arr, location) => {
  location.innerHTML = "";
  arr.forEach((review) => {
    let aBook = document.createElement("li");
    aBook.innerText = `${review.attributes.book.data.attributes.title} / Your rating: ${review.attributes.rating}`;
    //Delete the rating instance
    let deleteBtn = document.createElement("button");
    deleteBtn.innerText = "Delete";
    deleteBtn.addEventListener("click", async () => {
      await deleteReview(review.id);
      await renderProfile();
      await renderLoginBooks();
    });
    aBook.append(deleteBtn);
    location.append(aBook);
  });
};
// Sort
let sortList = (arr, param) => {
  arr.sort((a, b) => {
    if (param === "page") {
      return a.page - b.page;
    } else if (param === "author") {
      return a.author.localeCompare(b.author);
    } else {
      return a.title.localeCompare(b.title);
    }
  });
};
let sortRatedList = (arr, param) => {
  arr.sort((a, b) => {
    if (param === "rating") {
      return a.attributes.rating - b.attributes.rating;
    } else if (param === "author") {
      return a.attributes.book.data.attributes.author.localeCompare(
        b.attributes.book.data.attributes.author
      );
    } else {
      return a.attributes.book.data.attributes.title.localeCompare(
        b.attributes.book.data.attributes.title
      );
    }
  });
};
// Add to Profile Page
const addToReadingList = async (userID, bookIdToAdd) => {
  let userData = await axios.get(
    `http://localhost:1337/api/users/${userID}?populate=reading_lists`
  );
  let currentReadingList = userData.data.reading_lists;
  await axios.put(
    `http://localhost:1337/api/users/${userID}?populate=reading_lists`,
    {
      reading_lists: [
        ...currentReadingList,
        {
          id: bookIdToAdd,
        },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("token")}`,
      },
    }
  );
};
let addRating = async (rating, userID, bookID) => {
  await axios.post(
    "http://localhost:1337/api/ratings?populate=*",
    {
      data: { rating: rating, book: bookID, reviewer: userID },
    },
    {
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("token")}`,
      },
    }
  );
};
const deleteReview = async (id) => {
  await axios.delete(`http://localhost:1337/api/ratings/${id}`, {
    headers: {
      Authorization: `Bearer ${sessionStorage.getItem("token")}`,
    },
  });
};

//// 2-2, Render Books
const renderLoginBooks = async () => {
  // ユーザーのReading Listを調べ、リストにない作品に追加ボタンを表示
  let user = JSON.parse(sessionStorage.getItem("user"));
  let userData = await axios.get(
    `http://localhost:1337/api/users/${user.id}?populate=*`
  );
  let readingList = userData.data.reading_lists;

  // Book Div
  bookDiv.innerHTML = "";
  let response = await axios.get("http://localhost:1337/api/books?populate=*");
  let books = response.data.data;

  // Book Card
  books.forEach((book) => {
    let bookCard = document.createElement("article");
    bookCard.classList = "bookCard";

    // Ratingの平均値を出す
    let totalRating = 0;
    let reviewCount = 0;
    let reviews = book.attributes.ratings.data;
    reviews.forEach((review) => {
      let rating = review.attributes.rating;
      totalRating += rating;
      reviewCount++;
    });
    let averageScore = Math.round((totalRating / reviewCount) * 10) / 10;

    //DOMに書き出し
    let bookImage = document.createElement("img");
    bookImage.src = `http://localhost:1337${book.attributes.image.data[0].attributes.url}`;

    let bookDescription = document.createElement("div");
    bookDescription.innerHTML = `
        <p>Title: ${book.attributes.title}</p>
        <p>Author: ${book.attributes.author}</p>
        <p>Pages: ${book.attributes.page}</p>
        <p>Rating Average: ${averageScore}</p>
      `;

    //// Rating ////
    let ratingInput = document.createElement("input");
    ratingInput.type = "number";
    ratingInput.placeholder = "Rate 0 to 10";
    ratingInput.max = 10;
    ratingInput.min = 0;
    let addRatingBtn = document.createElement("button");
    addRatingBtn.innerText = "Rate the book";
    addRatingBtn.addEventListener("click", async () => {
      await addRating(ratingInput.value, user.id, book.id);
      await renderLoginBooks();
      await renderProfile();
    });

    bookDescription.append(ratingInput, addRatingBtn);

    // Rated Listにある場合はinput削除
    let ratedID = userData.data.ratings.map((rating) => {
      return rating.id;
    });
    // reviews(本の評価たち)のIDとratedID(ユーザーが評価した評価のID)が一致する時、ボタンを消す。
    reviews.forEach((review) => {
      if (ratedID.includes(review.id)) {
        ratingInput.remove();
        addRatingBtn.remove();
      }
    });

    //// Reading ////
    // Reading Listに追加ボタン
    let addReadingListBtn = document.createElement("button");
    addReadingListBtn.innerText = "Add to Reading List";
    addReadingListBtn.addEventListener("click", async () => {
      await addToReadingList(user.id, book.id);
      await renderLoginBooks();
      await renderProfile();
    });
    bookDescription.append(addReadingListBtn);

    // Reading Listにある場合はAddボタン削除
    readingList.forEach((list) => {
      if (list.id == book.id) {
        addReadingListBtn.remove();
      }
    });

    bookCard.append(bookImage, bookDescription);
    bookDiv.append(bookCard);
  });
};

//////////////////// Default Trigger Condition ////////////////////
if (sessionStorage.getItem("token")) {
  renderProfile();
  renderLoginBooks();
} else {
  renderLoginPage();
  renderBooks();
}
