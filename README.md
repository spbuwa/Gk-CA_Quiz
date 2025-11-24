# General Knowledge & Current Affairs Quiz

An interactive, multimedia-enabled quiz application designed for students to test their knowledge on Politics, History, Science, and more.

### 🎮 [Click Here to Play the Quiz Live](https://spbuwa.github.io/Gk-CA_Quiz/)

---

## 🌟 Key Features
* **Multimedia Support:** Questions can include Images, Audio, and Video.
* **Topic Selection:** Filter questions by specific categories (e.g., International Relations, History, Sports).
* **Instant Feedback:** Scores are calculated immediately.
* **Explanations:** Detailed explanations and external links provided for deep learning.
* **Timer:** A 60-second timer per question to simulate exam conditions.
* **Mobile Friendly:** Works perfectly on smartphones, tablets, and laptops.

---

## 📂 Project Structure
This project is split into **Online (Player)** and **Offline (Admin)** components for security.

### 1. Online Files (GitHub)
These are the files visible to the public:
* `index.html`: The main quiz player interface.
* `script.js`: The game logic engine.
* `data.js`: The question database (JSON format).
* `assets/`: Folder containing images and media files.
* `paper-quiz.html`: Generates printable PDF exam papers and answer keys.


### 2. Offline Tools (Admin Only)
*These files are kept locally on the administrator's computer:*
* `dashboard.html`: The central hub for managing the quiz.
* `builder.html`: Tool to add new questions or import from CSV.
* `manager.html`: Tool to tag and categorize existing questions.

---

## ⚙️ How to Update the Quiz (Administrator Guide)

**Note:** To maintain security, questions are edited locally and then pushed to the live site.

1.  **Edit Locally:** Open `builder.html` or `manager.html` on your local computer.
2.  **Make Changes:** Add new questions or fix typos.
3.  **Export:** Download the updated `data.js` file.
4.  **Replace:** Overwrite the old `data.js` in your local project folder.
5.  **Publish:** Upload the new `data.js` to this GitHub repository.
    * *Go to "Add file" -> "Upload files".*
    * *Commit directly to the main branch.*

---

## ⚠️ Important Note on Media
GitHub is **case-sensitive**.
* ✅ `assets/tiger.jpg` will work.
* ❌ `assets/Tiger.JPG` will **break** (if the code expects lowercase).
* *Always ensure filenames in `data.js` match the actual file names exactly.*
---
## About the .md format - Markdown
Markdown is a lightweight markup language that many technical professionals use to create and edit technical documents. 
With Markdown, you write text in a plain text editor (such as vi or Emacs), inserting special characters to create 
headers, boldface, bullets, and so on. For example, the following example shows a simple technical document formatted with Markdown:

* [Click here to take a tutorial about the Markdown format.](https://www.markdowntutorial.com/)
* [Learn from Github documentation page.](https://guides.github.com/features/mastering-markdown/)


---

## 👨‍🏫 Author
**Shubharaj Buwa**
*Associate Professor, Political Science*
*Dr. T. K. Tope Arts & Commerce Night College, Mumbai*
