export const QUESTIONS_STORAGE_KEY = "thinktech_questions_v1";

// Default Question Banks
const defaultQuestions = {
  l1: [
    { emoji: "💻🔑🙊", question: "Hint: It is tested, not displayed.", answer: "Password", options: ["Password", "Hash Value", "Access Token", "Encryption Key"], explanation: "A password is input secretly for authentication and is verified rather than displayed on screen." },
    { emoji: "📄🪞💾", question: "Hint: Two storage locations behave like one.", answer: "Data Mirroring", options: ["Data Mirroring", "Data Replication", "Data Backup", "Data Redundancy"], explanation: "Data Mirroring duplicates storage across separate disks in real time so they act as a single redundant volume." },
    { emoji: "⛓️📦🔗", question: "Hint: Everyone shares the same trusted history.", answer: "Blockchain", options: ["Blockchain", "Distributed Ledger", "Hash Chain", "Consensus Protocol"], explanation: "Blockchain provides a decentralized, tamper-proof distributed ledger shared among all nodes." },
    { emoji: "📷🏠📱", question: "Hint: Monitor your home from anywhere using a connected device.", answer: "Internet of Things (IoT)", options: ["Internet of Things (IoT)", "Smart Home Network", "Cloud Computing", "Edge Computing"], explanation: "IoT connects physical objects like cameras and home appliances to the internet for remote monitoring." },
    { emoji: "⚙️🧠💻", question: "Hint: I control hardware and software communication.", answer: "Kernel", options: ["Kernel", "Firmware", "Device Driver", "BIOS"], explanation: "The Kernel is the core component of an OS that manages hardware resources and software interactions." },
    { emoji: "🚦🚪✅", question: "Hint: Wait for your turn before entering.", answer: "Semaphore", options: ["Semaphore", "Mutex", "Deadlock", "Race Condition"], explanation: "A Semaphore acts as a synchronization flag regulating access to shared resources in concurrent systems." },
    { emoji: "💻💾🧠", question: "Hint: I save time by avoiding repeated retrieval.", answer: "Cache Memory", options: ["Cache Memory", "Virtual Memory", "Buffer", "RAM"], explanation: "Cache memory stores frequently accessed data near the CPU to speed up retrieval times." },
    { emoji: "📝💻🔁", question: "Hint: I create a runnable program from source code.", answer: "Compiler", options: ["Compiler", "Interpreter", "Assembler", "Linker"], explanation: "A compiler translates high-level source code into machine code binaries before execution." },
    { emoji: "🌐🧠💻", question: "Hint: I remember your login.", answer: "Cookies", options: ["Cookies", "Session", "Cache", "Token"], explanation: "Cookies are small data files stored by browsers to maintain user session state across requests." },
    { emoji: "🎣🌐⚠️", question: "Hint: A fake website is waiting for your credentials.", answer: "Phishing", options: ["Phishing", "Spoofing", "Malware", "Ransomware"], explanation: "Phishing involves spoofing legitimate sites to deceive users into surrendering sensitive credentials." }
  ],
  l2: [
    { question: "I have no brain, yet I decide which process runs next. Who am I?", answer: "CPU Scheduler", explanation: "The CPU Scheduler in an OS decides which process executes on the CPU next based on scheduling algorithms." },
    { question: "I organize billions of web pages so you can find information in seconds. Who am I?", answer: "Search Engine", explanation: "Search engines crawl, index, and query web pages to return relevant search results in milliseconds." },
    { question: "I am born when a program starts and die when it finishes. Who am I?", answer: "Process", explanation: "A process is an active instance of a program in memory created at launch and terminated on exit." },
    { question: "I live inside a process and share its memory with my siblings. Who am I?", answer: "Thread", explanation: "A thread is a lightweight execution unit inside a process that shares address space with other threads." },
    { question: "I decide what actions you are allowed to perform after logging in. Who am I?", answer: "Authorization", explanation: "Authorization evaluates permissions to determine what resources an authenticated user can access." },
    { question: "I can crash without getting hurt. Who am I?", answer: "Server", explanation: "A server system can experience software crashes without incurring physical damage to hardware." },
    { question: "I am opened by millions every day, but I am never a door. Who am I?", answer: "Browser", explanation: "A web browser opens web pages and application interfaces without being a physical door." },
    { question: "I never sleep because I keep websites alive 24/7. Who am I?", answer: "Web Server", explanation: "Web servers run continuous background daemons (like Apache or Nginx) to serve HTTP requests 24/7." },
    { question: "I welcome every program before the user sees anything. Who am I?", answer: "Operating System", explanation: "The Operating System boots hardware, manages resources, and sets up the execution environment for applications." },
    { question: "I can erase years of work with one wrong command. Who am I?", answer: "Delete", explanation: "Commands like 'rm -rf' or SQL 'DELETE/DROP' permanently wipe data if executed without caution." }
  ],
  l3: [
    { tasks: [
      { label: "Task 1: Find the import statement", code: "public class Demo {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int age = sc.nextInt();\n        System.out.println(age);\n    }\n}", answer: "import java.util.Scanner;" },
      { label: "Task 2: Debug the program", code: "public class Demo {\n    public static void main(String[] args) {\n        int x = 15\n        System.out.println(x);\n    }\n}", answer: "int x = 15;" },
      { label: "Task 3: What is the output?", code: "public class Demo {\n    public static void main(String[] args) {\n        int a = 8;\n        int b = 3;\n        System.out.println(a % b + b);\n    }\n}", answer: "5" }
    ], explanation: "1) Scanner class belongs to java.util package. 2) Missing semicolon after variable assignment. 3) Modulo 8 % 3 = 2, and 2 + 3 = 5." },
    { tasks: [
      { label: "Task 1: Find the import statement", code: "numbers = [12, 5, 18, 20]\nprint(mean(numbers))", answer: "from statistics import mean" },
      { label: "Task 2: Debug the program", code: "name = \"ThinkTech\"\nif name == \"ThinkTech\"\n    print(\"Welcome\")", answer: "name = \"ThinkTech\"\nif name == \"ThinkTech\":\n    print(\"Welcome\")" },
      { label: "Task 3: What is the output?", code: "x = 10\ny = 3\nprint(x // y)", answer: "3" }
    ], explanation: "1) mean function comes from statistics. 2) Python if statements require a trailing colon. 3) Floor division 10 // 3 = 3." },
    { tasks: [
      { label: "Task 1: Find the header file", code: "int main()\n{\n    FILE *fp;\n    fp = fopen(\"data.txt\", \"r\");\n    if(fp == NULL)\n    {\n        printf(\"File not found\");\n    }\n    return 0;\n}", answer: "#include <stdio.h>" },
      { label: "Task 2: Debug the program", code: "#include<stdio.h>\nint main()\n{\n    float x = 10, y = 4;\n    printf(\"%d\", x / y);\n    return 0;\n}", answer: "printf(\"%.2f\", x / y);" },
      { label: "Task 3: What is the output?", code: "#include<stdio.h>\nint main()\n{\n    int x = 3;\n    printf(\"%d\", x++ + ++x);\n    return 0;\n}", answer: "Undefined Behavior" }
    ], explanation: "1) FILE pointers require stdio.h header. 2) x / y is float, so %f format specifier is needed. 3) Modifying x twice in one expression causes Undefined Behavior in C." },
    { tasks: [
      { label: "Task 1: Find the import statement", code: "today = datetime.now()\nprint(today.year)", answer: "from datetime import datetime" },
      { label: "Task 2: Debug the program", code: "numbers = [10,20,30]\nprint(numbers[3])", answer: "print(numbers[2])" },
      { label: "Task 3: What is the output?", code: "x = [1,2]\ny = x\ny.append(3)\nprint(x)", answer: "[1, 2, 3]" }
    ], explanation: "1) datetime class is in datetime module. 2) 0-based indexing means 3rd item is index 2. 3) y is a reference to list x, so appending mutates x." },
    { tasks: [
      { label: "Task 1: Find the import statement", code: "public class Demo {\n    public static void main(String[] args) {\n        LocalDate today = LocalDate.now();\n        System.out.println(today);\n    }\n}", answer: "import java.time.LocalDate;" },
      { label: "Task 2: Debug the program", code: "public class Demo {\n    public static void main(String[] args) {\n        String name = null;\n        System.out.println(name.length());\n    }\n}", answer: "if(name != null)\n{\n    System.out.println(name.length());\n}" },
      { label: "Task 3: What is the output?", code: "public class Demo {\n    public static void main(String[] args) {\n        String s = \"Think\";\n        s.concat(\"Tech\");\n        System.out.println(s);\n    }\n}", answer: "Think" }
    ], explanation: "1) LocalDate belongs to java.time. 2) Calling methods on null throws NullPointerException unless guarded. 3) Strings are immutable in Java so s remains 'Think'." }
  ],
  l4: [
    { title: "The Secret Lab Escape", body: "Five scientists are trapped inside a laboratory.\nThe exit door opens only if exactly two statements are true.\n\nThe scientists say:\nA: \"B is lying.\"\nB: \"C is lying.\"\nC: \"D and E are telling the truth.\"\nD: \"A is telling the truth.\"\nE: \"Exactly three of us are telling the truth.\"\n\nQuestion: Who is telling the truth?", answerKey: "Only B and D are telling the truth.", maxMarks: 10, explanation: "Evaluating truth values shows that assuming B and D are true creates a consistent set with exactly 2 true statements." },
    { title: "The Password Mystery", body: "A password consists of four different digits.\n\nClues:\n682 → One digit is correct and in the correct place.\n614 → One digit is correct but in the wrong place.\n206 → Two digits are correct but both are in the wrong places.\n738 → None of the digits are correct.\n780 → One digit is correct but in the wrong place.\n\nQuestion: Find the password.", answerKey: "0426", maxMarks: 10, explanation: "7, 3, 8 are eliminated. Position analysis yields 0 at pos 1, 4 at pos 2, 2 at pos 3, and 6 at pos 4 (0426)." },
    { title: "The Four Engineers", body: "Four engineers—Asha, Bharat, Charan, and Divya—created four different projects:\nAI Chatbot, Smart Traffic System, Drone Delivery, Cybersecurity Tool.\nEach project won one position (1st–4th).\n\nClues:\n1. Asha did not build the AI Chatbot.\n2. The Drone Delivery project ranked immediately after the Smart Traffic System.\n3. Bharat ranked lower than Divya.\n4. Charan built the Cybersecurity Tool.\n5. The 1st place project was not Cybersecurity.\n6. Asha ranked higher than Bharat.\n7. Divya did not build Drone Delivery.\n8. The AI Chatbot ranked last.\n\nQuestions: Who built each project? What was the final ranking?", answerKey: "Divya – Smart Traffic – 1st\nAsha – Drone Delivery – 2nd\nCharan – Cybersecurity – 3rd\nBharat – AI Chatbot – 4th", maxMarks: 10, explanation: "Solving constraints: 1st=Divya (Smart Traffic), 2nd=Asha (Drone Delivery), 3rd=Charan (Cybersecurity), 4th=Bharat (AI Chatbot)." }
  ]
};

let loadedQuestions = { ...defaultQuestions };

function loadQuestions() {
  try {
    const stored = localStorage.getItem(QUESTIONS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      ['l1', 'l2', 'l3', 'l4'].forEach(lk => {
        if (Array.isArray(parsed[lk]) && Array.isArray(defaultQuestions[lk])) {
          parsed[lk].forEach((q, i) => {
            if (!q.explanation && defaultQuestions[lk][i] && defaultQuestions[lk][i].explanation) {
              q.explanation = defaultQuestions[lk][i].explanation;
            }
          });
        }
      });
      loadedQuestions = parsed;
    }
  } catch (e) {
    // fallback to defaults
  }
}

function saveAllQuestions() {
  try {
    localStorage.setItem(QUESTIONS_STORAGE_KEY, JSON.stringify(loadedQuestions));
  } catch (e) {}
}

// Initial load
loadQuestions();

export function getQuestions(levelKey) {
  loadQuestions(); // refresh
  return loadedQuestions[levelKey];
}

export function saveQuestions(levelKey, newQuestions) {
  loadedQuestions[levelKey] = newQuestions;
  saveAllQuestions();
}

export function resetQuestionsToDefault() {
  loadedQuestions = JSON.parse(JSON.stringify(defaultQuestions));
  saveAllQuestions();
}

export function l4MaxTotal() {
  return getQuestions('l4').reduce((sum, q) => sum + (q.maxMarks || 10), 0);
}
