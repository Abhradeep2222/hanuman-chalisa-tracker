/**
 * Complete and Verified Authentic Hanuman Chalisa Text Data
 * Includes Hindi, English Roman transliteration, Bengali script, and aligned word tokens.
 */

const CHALISA_DATA = {
  title: {
    hi: "श्री हनुमान चालीसा",
    en: "Shri Hanuman Chalisa",
    bn: "শ্রী হনুমান চালীসা"
  },

  verses: [
    // ===== Opening Doha 1 =====
    {
      type: "doha-start",
      num: 1,
      totalOfCategory: 2,
      label: { hi: "प्रारंभिक दोहा", en: "Opening Doha", bn: "প্রারম্ভিক দোহা" },
      lines: [
        {
          hi: "श्री गुरु चरन सरोज रज निज मनु मुकुरु सुधारि।",
          en: "Shri Guru Charan Saroj Raj Nij Manu Mukuru Sudhari |",
          bn: "শ্রী গুরু চরণ সরোজ রজ নিজ মনু মুকুর সুধারি।"
        },
        {
          hi: "बरनउँ रघुबर बिमल जसु जो दायकु फल चारि॥",
          en: "Baranau Raghubar Bimal Jasu Jo Dayaku Phal Chari ||",
          bn: "বরনউঁ রঘুবর বিমল জসু জো দায়কু ফল চারি॥"
        }
      ]
    },
    // ===== Opening Doha 2 =====
    {
      type: "doha-start",
      num: 2,
      totalOfCategory: 2,
      label: { hi: "प्रारंभिक दोहा", en: "Opening Doha", bn: "প্রারম্ভিক দোহা" },
      lines: [
        {
          hi: "बुद्धिहीन तनु जानिके सुमिरौं पवन-कुमार।",
          en: "Buddhiheen Tanu Janike Sumirau Pawan-Kumar |",
          bn: "বুদ্ধিহীন তনু জানিকে সুমিরৌং পবন-কুমার।"
        },
        {
          hi: "बल बुद्धि बिद्या देहु मोहिं हरहु कलेस बिकार॥",
          en: "Bal Buddhi Vidya Dehu Mohi Harahu Kalesh Vikar ||",
          bn: "বল বুদ্ধি বিদ্যা দেহু মোহিং হরহু কলেশ বিকার॥"
        }
      ]
    },
    // ===== Chaupai 1 =====
    {
      type: "chaupai",
      num: 1,
      totalOfCategory: 40,
      label: { hi: "चौपाई", en: "Chaupai", bn: "চৌপাঈ" },
      lines: [
        {
          hi: "जय हनुमान ज्ञान गुन सागर।",
          en: "Jai Hanuman Gyan Gun Sagar |",
          bn: "জয় হনুমান জ্ঞান গুন সাগর।"
        },
        {
          hi: "जय कपीस तिहुँ लोक उजागर॥",
          en: "Jai Kapis Tihun Lok Ujagar ||",
          bn: "জয় কপীস তিহুঁ লোক উজাগর॥"
        }
      ]
    },
    // ===== Chaupai 2 =====
    {
      type: "chaupai",
      num: 2,
      totalOfCategory: 40,
      label: { hi: "चौपाई", en: "Chaupai", bn: "চৌপাঈ" },
      lines: [
        {
          hi: "रामदूत अतुलित बल धामा।",
          en: "Ramdoot Atulit Bal Dhama |",
          bn: "রামদূত অতুলিত বল ধামা।"
        },
        {
          hi: "अंजनि-पुत्र पवनसुत नामा॥",
          en: "Anjani-Putra Pawansut Nama ||",
          bn: "অঞ্জনী-পুত্র পবনসুত নামা॥"
        }
      ]
    },
    // ===== Chaupai 3 =====
    {
      type: "chaupai",
      num: 3,
      totalOfCategory: 40,
      label: { hi: "चौपाई", en: "Chaupai", bn: "চৌপাঈ" },
      lines: [
        {
          hi: "महाबीर बिक्रम बजरंगी।",
          en: "Mahabir Bikram Bajrangi |",
          bn: "মহাবীর বিক্রম বজরঙ্গী।"
        },
        {
          hi: "कुमति निवार सुमति के संगी॥",
          en: "Kumati Nivar Sumati Ke Sangi ||",
          bn: "কুমতি নিবার সুমতি কে সঙ্গী॥"
        }
      ]
    },
    // ===== Chaupai 4 =====
    {
      type: "chaupai",
      num: 4,
      totalOfCategory: 40,
      label: { hi: "चौपाई", en: "Chaupai", bn: "চৌপাঈ" },
      lines: [
        {
          hi: "कंचन बरन बिराज सुबेसा।",
          en: "Kanchan Baran Biraj Subesa |",
          bn: "কাঞ্চন বরণ বিরাজ সুবেসা।"
        },
        {
          hi: "कानन कुंडल कुंचित केसा॥",
          en: "Kanan Kundal Kunchit Kesa ||",
          bn: "কানন কুণ্ডল কুঞ্চিত কেশা॥"
        }
      ]
    },
    // ===== Chaupai 5 =====
    {
      type: "chaupai",
      num: 5,
      totalOfCategory: 40,
      label: { hi: "चौपाई", en: "Chaupai", bn: "চৌপাঈ" },
      lines: [
        {
          hi: "हाथ बज्र औ ध्वजा बिराजै।",
          en: "Hath Bajra Au Dhwaja Birajai |",
          bn: "হাথ বজ্র ঔ ধ্বজা বিরাজৈ।"
        },
        {
          hi: "काँधे मूँज जनेऊ साजै॥",
          en: "Kandhe Moonj Janeu Sajai ||",
          bn: "কাঁধে মূঁজ জনেঊ সাজৈ॥"
        }
      ]
    },
    // ===== Chaupai 6 =====
    {
      type: "chaupai",
      num: 6,
      totalOfCategory: 40,
      label: { hi: "चौपाई", en: "Chaupai", bn: "চৌপাঈ" },
      lines: [
        {
          hi: "शंकर सुवन केसरी नंदन।",
          en: "Shankar Suwan Kesari Nandan |",
          bn: "শঙ্কর সুবন কেশরী নন্দন।"
        },
        {
          hi: "तेज प्रताप महा जग बंदन॥",
          en: "Tej Pratap Maha Jag Bandan ||",
          bn: "তেজ প্রতাপ মহা জগ বন্দন॥"
        }
      ]
    },
    // ===== Chaupai 7 =====
    {
      type: "chaupai",
      num: 7,
      totalOfCategory: 40,
      label: { hi: "चौपाई", en: "Chaupai", bn: "চৌपाঈ" },
      lines: [
        {
          hi: "विद्यावान गुनी अति चातुर।",
          en: "Vidyawan Guni Ati Chatur |",
          bn: "বিদ্যাবান গুণী অতি চাতুর।"
        },
        {
          hi: "राम काज करिबे को आतुर॥",
          en: "Ram Kaj Karibe Ko Atur ||",
          bn: "রাম কাজ করিবে কো আতুর॥"
        }
      ]
    },
    // ===== Chaupai 8 =====
    {
      type: "chaupai",
      num: 8,
      totalOfCategory: 40,
      label: { hi: "चौपाई", en: "Chaupai", bn: "চৌপাঈ" },
      lines: [
        {
          hi: "प्रभु चरित्र सुनिबे को रसिया।",
          en: "Prabhu Charitra Sunibe Ko Rasiya |",
          bn: "প্রভু চরিত্র সুনিবে কো রসিয়া।"
        },
        {
          hi: "राम लखन सीता मन बसिया॥",
          en: "Ram Lakhan Sita Man Basiya ||",
          bn: "রাম লখন সীতা মন বসিয়া॥"
        }
      ]
    },
    // ===== Chaupai 9 =====
    {
      type: "chaupai",
      num: 9,
      totalOfCategory: 40,
      label: { hi: "चौपाई", en: "Chaupai", bn: "চৌপাঈ" },
      lines: [
        {
          hi: "सूक्ष्म रूप धरि सियहिं दिखावा।",
          en: "Sukshma Roop Dhari Siyahi Dikhawa |",
          bn: "সূক্ষ্ম রূপ ধরি সিয়হিং দিখাবা।"
        },
        {
          hi: "बिकट रूप धरि लंक जरावा॥",
          en: "Bikat Roop Dhari Lanka Jarawa ||",
          bn: "বিকট রূপ ধরি লঙ্ক জরাবা॥"
        }
      ]
    },
    // ===== Chaupai 10 =====
    {
      type: "chaupai",
      num: 10,
      totalOfCategory: 40,
      label: { hi: "चौपाई", en: "Chaupai", bn: "চৌপাঈ" },
      lines: [
        {
          hi: "भीम रूप धरि असुर संहारे।",
          en: "Bhim Roop Dhari Asur Sanhare |",
          bn: "ভীম রূপ ধরি অসুর সংহারে।"
        },
        {
          hi: "रामचन्द्र के काज संवारे॥",
          en: "Ramchandra Ke Kaj Sanware ||",
          bn: "রামচন্দ্র কে কাজ সংবারে॥"
        }
      ]
    },
    // ===== Chaupai 11 =====
    {
      type: "chaupai",
      num: 11,
      totalOfCategory: 40,
      label: { hi: "चौपाई", en: "Chaupai", bn: "চৌপাঈ" },
      lines: [
        {
          hi: "लाय सजीवन लखन जियाये।",
          en: "Lay Sajivan Lakhan Jiyaye |",
          bn: "লায় সজীবন লখন জিয়ায়ৈ।"
        },
        {
          hi: "श्री रघुबीर हरषि उर लाये॥",
          en: "Shri Raghubir Harashi Ur Laye ||",
          bn: "শ্রী রঘুবীর হরষি উর লায়ৈ॥"
        }
      ]
    },
    // ===== Chaupai 12 =====
    {
      type: "chaupai",
      num: 12,
      totalOfCategory: 40,
      label: { hi: "चौपाई", en: "Chaupai", bn: "চৌপাঈ" },
      lines: [
        {
          hi: "रघुपति कीन्हीं बहुत बड़ाई।",
          en: "Raghupati Kinhi Bahut Badai |",
          bn: "রঘুপতি কীন্হীং বহুত বড়াই।"
        },
        {
          hi: "तुम मम प्रिय भरतहि सम भाई॥",
          en: "Tum Mam Priya Bharatahi Sam Bhai ||",
          bn: "তুম মম প্রিয় ভরতহি সম ভাই॥"
        }
      ]
    },
    // ===== Chaupai 13 =====
    {
      type: "chaupai",
      num: 13,
      totalOfCategory: 40,
      label: { hi: "चौपाई", en: "Chaupai", bn: "চৌপাঈ" },
      lines: [
        {
          hi: "सहस बदन तुम्हरो जस गावैं।",
          en: "Sahas Badan Tumharo Jas Gawen |",
          bn: "সহস বদন তুম্হরো জস গাবৈং।"
        },
        {
          hi: "अस कहि श्रीपति कंठ लगावैं॥",
          en: "As Kahi Shripati Kanth Lagawen ||",
          bn: "অস কহি শ্রীপতি কণ্ঠ লগাবৈং॥"
        }
      ]
    },
    // ===== Chaupai 14 =====
    {
      type: "chaupai",
      num: 14,
      totalOfCategory: 40,
      label: { hi: "चौपाई", en: "Chaupai", bn: "চৌপাঈ" },
      lines: [
        {
          hi: "सनकादिक ब्रह्मादि मुनीसा।",
          en: "Sankadik Brahmadi Munisa |",
          bn: "সনকাদিক ব্রহ্মাদি মুনীসা।"
        },
        {
          hi: "नारद सारद सहित अहीसा॥",
          en: "Narad Sarad Sahit Ahisa ||",
          bn: "নারদ সারদ সহিত অহীসা॥"
        }
      ]
    },
    // ===== Chaupai 15 =====
    {
      type: "chaupai",
      num: 15,
      totalOfCategory: 40,
      label: { hi: "चौपाई", en: "Chaupai", bn: "চৌপাঈ" },
      lines: [
        {
          hi: "जम कुबेर दिगपाल जहाँ ते।",
          en: "Jam Kuber Digpal Jahan Te |",
          bn: "যম কুবের দিগপাল জহাঁ তে।"
        },
        {
          hi: "कबि कोबिद कहि सके कहाँ ते॥",
          en: "Kabi Kobid Kahi Sake Kahan Te ||",
          bn: "কবি কোবিদ কহি সকে কহাঁ তে॥"
        }
      ]
    },
    // ===== Chaupai 16 =====
    {
      type: "chaupai",
      num: 16,
      totalOfCategory: 40,
      label: { hi: "चौपाई", en: "Chaupai", bn: "চৌপাঈ" },
      lines: [
        {
          hi: "तुम उपकार सुग्रीवहिं कीन्हा।",
          en: "Tum Upkar Sugrivahin Kinha |",
          bn: "তুম উপকার সুগ্রীবহিং কীন্হা।"
        },
        {
          hi: "राम मिलाय राजपद दीन्हा॥",
          en: "Ram Milay Rajpad Dinha ||",
          bn: "রাম মিলায় রাজপদ দীন্হা॥"
        }
      ]
    },
    // ===== Chaupai 17 =====
    {
      type: "chaupai",
      num: 17,
      totalOfCategory: 40,
      label: { hi: "चौपाई", en: "Chaupai", bn: "চৌপাঈ" },
      lines: [
        {
          hi: "तुम्हरो मन्त्र विभीषन माना।",
          en: "Tumharo Mantra Vibhishan Mana |",
          bn: "তুম্হরো মন্ত্র বিভীষণ মানা।"
        },
        {
          hi: "लंकेश्वर भए सब जग जाना॥",
          en: "Lankeshwar Bhaye Sab Jag Jana ||",
          bn: "লঙ্কেশ্বর ভয়ে সব জগ জানা॥"
        }
      ]
    },
    // ===== Chaupai 18 =====
    {
      type: "chaupai",
      num: 18,
      totalOfCategory: 40,
      label: { hi: "चौपाई", en: "Chaupai", bn: "চৌপাঈ" },
      lines: [
        {
          hi: "जुग सहस्र जोजन पर भानू।",
          en: "Jug Sahastra Jojan Par Bhanu |",
          bn: "যুগ সহস্র যোজন পর ভানু।"
        },
        {
          hi: "लील्यो ताहि मधुर फल जानू॥",
          en: "Lilyo Tahi Madhur Phal Janu ||",
          bn: "লীল্যো তাহি মধুর ফল জানু॥"
        }
      ]
    },
    // ===== Chaupai 19 =====
    {
      type: "chaupai",
      num: 19,
      totalOfCategory: 40,
      label: { hi: "चौपाई", en: "Chaupai", bn: "চৌপাঈ" },
      lines: [
        {
          hi: "प्रभु मुद्रिका मेलि मुख माहीं।",
          en: "Prabhu Mudrika Meli Mukh Mahin |",
          bn: "প্রভু মুদ্রিকা মেলি মুখ মাহীং।"
        },
        {
          hi: "जलधि लाँघि गये अचरज नाहीं॥",
          en: "Jaladhi Langhi Gaye Achraj Nahin ||",
          bn: "জলধি লাঁঘি গয়ে অচরজ নাহীং॥"
        }
      ]
    },
    // ===== Chaupai 20 =====
    {
      type: "chaupai",
      num: 20,
      totalOfCategory: 40,
      label: { hi: "चौपाई", en: "Chaupai", bn: "চৌপাঈ" },
      lines: [
        {
          hi: "दुर्गम काज जगत के जेते।",
          en: "Durgam Kaj Jagat Ke Jete |",
          bn: "দুর্গম কাজ জগত কে জেতে।"
        },
        {
          hi: "सुगम अनुग्रह तुम्हरे तेते॥",
          en: "Sugam Anugraha Tumhare Tete ||",
          bn: "সুগম অনুগ্রহ তুম্হরে তেতে॥"
        }
      ]
    },
    // ===== Chaupai 21 =====
    {
      type: "chaupai",
      num: 21,
      totalOfCategory: 40,
      label: { hi: "चौपाई", en: "Chaupai", bn: "চৌপাঈ" },
      lines: [
        {
          hi: "राम दुआरे तुम रखवारे।",
          en: "Ram Duare Tum Rakhware |",
          bn: "রাম দুআরে তুম রখবারে।"
        },
        {
          hi: "होत न आज्ञा बिनु पैसारे॥",
          en: "Hot Na Agya Binu Paisare ||",
          bn: "হোত ন আজ্ঞা বিনু পৈসারে॥"
        }
      ]
    },
    // ===== Chaupai 22 =====
    {
      type: "chaupai",
      num: 22,
      totalOfCategory: 40,
      label: { hi: "चौपाई", en: "Chaupai", bn: "চৌপাঈ" },
      lines: [
        {
          hi: "सब सुख लहै तुम्हारी सरना।",
          en: "Sab Sukh Lahen Tumhari Sarna |",
          bn: "সব সুখ লহৈং তুম্হারী শরণা।"
        },
        {
          hi: "तुम रक्षक काहू को डर ना॥",
          en: "Tum Rakshak Kahu Ko Dar Na ||",
          bn: "তুম রক্ষক কাহূ কো ডর না॥"
        }
      ]
    },
    // ===== Chaupai 23 =====
    {
      type: "chaupai",
      num: 23,
      totalOfCategory: 40,
      label: { hi: "चौपाई", en: "Chaupai", bn: "চৌপাঈ" },
      lines: [
        {
          hi: "आपन तेज सम्हारो आपै।",
          en: "Aapan Tej Samharo Aape |",
          bn: "আপন তেজ সম্হারো আপৈ।"
        },
        {
          hi: "तीनों लोक हाँक तें काँपै॥",
          en: "Teenon Lok Hank Te Kanpe ||",
          bn: "তীনোং লোক হাঁক তেং কাঁপৈ॥"
        }
      ]
    },
    // ===== Chaupai 24 =====
    {
      type: "chaupai",
      num: 24,
      totalOfCategory: 40,
      label: { hi: "चौपाई", en: "Chaupai", bn: "চৌপাঈ" },
      lines: [
        {
          hi: "भूत पिसाच निकट नहिं आवै।",
          en: "Bhoot Pisach Nikat Nahi Awe |",
          bn: "ভূত পিশাচ নিকট নহিং আবৈ।"
        },
        {
          hi: "महाबीर जब नाम सुनावै॥",
          en: "Mahabir Jab Nam Sunawe ||",
          bn: "মহাবীর জব নাম সুনাবৈ॥"
        }
      ]
    },
    // ===== Chaupai 25 =====
    {
      type: "chaupai",
      num: 25,
      totalOfCategory: 40,
      label: { hi: "चौपाई", en: "Chaupai", bn: "চৌপাঈ" },
      lines: [
        {
          hi: "नासै रोग हरै सब पीरा।",
          en: "Nase Rog Hare Sab Pira |",
          bn: "নাসৈ রোগ হরৈ সব পীরা।"
        },
        {
          hi: "जपत निरंतर हनुमत बीरा॥",
          en: "Japat Nirantar Hanumat Bira ||",
          bn: "জপত নিরন্তর হনুমত বীরা॥"
        }
      ]
    },
    // ===== Chaupai 26 =====
    {
      type: "chaupai",
      num: 26,
      totalOfCategory: 40,
      label: { hi: "चौपाई", en: "Chaupai", bn: "চৌপাঈ" },
      lines: [
        {
          hi: "संकट तें हनुमान छुड़ावै।",
          en: "Sankat Te Hanuman Chhudawe |",
          bn: "সংকট তেং হনুমান ছুড়াবৈ।"
        },
        {
          hi: "मन क्रम बचन ध्यान जो लावै॥",
          en: "Man Kram Bachan Dhyan Jo Lawe ||",
          bn: "মন ক্রম বচন ধ্যান জো লাবৈ॥"
        }
      ]
    },
    // ===== Chaupai 27 =====
    {
      type: "chaupai",
      num: 27,
      totalOfCategory: 40,
      label: { hi: "चौपाई", en: "Chaupai", bn: "চৌপাঈ" },
      lines: [
        {
          hi: "सब पर राम तपस्वी राजा।",
          en: "Sab Par Ram Tapasvi Raja |",
          bn: "সব পর রাম তপস্বী রাজা।"
        },
        {
          hi: "तिन के काज सकल तुम साजा॥",
          en: "Tin Ke Kaj Sakal Tum Saja ||",
          bn: "তিন কে কাজ সকল তুম সাজা॥"
        }
      ]
    },
    // ===== Chaupai 28 =====
    {
      type: "chaupai",
      num: 28,
      totalOfCategory: 40,
      label: { hi: "चौपाई", en: "Chaupai", bn: "চৌপাঈ" },
      lines: [
        {
          hi: "और मनोरथ जो कोई लावै।",
          en: "Aur Manorath Jo Koi Lave |",
          bn: "ঔর মনোরথ জো কোই লাবৈ।"
        },
        {
          hi: "सोइ अमित जीवन फल पावै॥",
          en: "Soi Amit Jivan Phal Pave ||",
          bn: "সোই অমিত জীবন ফল পাবৈ॥"
        }
      ]
    },
    // ===== Chaupai 29 =====
    {
      type: "chaupai",
      num: 29,
      totalOfCategory: 40,
      label: { hi: "चौपाई", en: "Chaupai", bn: "চৌপাঈ" },
      lines: [
        {
          hi: "चारों जुग परताप तुम्हारा।",
          en: "Charon Jug Partap Tumhara |",
          bn: "চারোং যুগ পরতাপ তুম্হারা।"
        },
        {
          hi: "है परसिद्ध जगत उजियारा॥",
          en: "Hai Parsiddh Jagat Ujiyara ||",
          bn: "হৈ পরসিদ্ধ জগত উজিয়ারা॥"
        }
      ]
    },
    // ===== Chaupai 30 =====
    {
      type: "chaupai",
      num: 30,
      totalOfCategory: 40,
      label: { hi: "चौपाई", en: "Chaupai", bn: "চৌপাঈ" },
      lines: [
        {
          hi: "साधु संत के तुम रखवारे।",
          en: "Sadhu Sant Ke Tum Rakhware |",
          bn: "সাধু সন্ত কে তুম রখবারে।"
        },
        {
          hi: "असुर निकंदन राम दुलारे॥",
          en: "Asur Nikandan Ram Dulare ||",
          bn: "অসুর নিকন্দন রাম দুলারে॥"
        }
      ]
    },
    // ===== Chaupai 31 =====
    {
      type: "chaupai",
      num: 31,
      totalOfCategory: 40,
      label: { hi: "चौपाई", en: "Chaupai", bn: "চৌপাঈ" },
      lines: [
        {
          hi: "अष्ट सिद्धि नौ निधि के दाता।",
          en: "Ashta Siddhi Nau Nidhi Ke Data |",
          bn: "অষ্ট সিদ্ধি নৌ নিধি কে দাতা।"
        },
        {
          hi: "अस बर दीन जानकी माता॥",
          en: "As Bar Din Janki Mata ||",
          bn: "অস বর দীন জানকী মাতা॥"
        }
      ]
    },
    // ===== Chaupai 32 =====
    {
      type: "chaupai",
      num: 32,
      totalOfCategory: 40,
      label: { hi: "चौपाई", en: "Chaupai", bn: "চৌপাঈ" },
      lines: [
        {
          hi: "राम रसायन तुम्हरे पासा।",
          en: "Ram Rasayan Tumhare Pasa |",
          bn: "রাম রসায়ন তুম্হরে পাসা।"
        },
        {
          hi: "सदा रहो रघुपति के दासा॥",
          en: "Sada Raho Raghupati Ke Dasa ||",
          bn: "সদা রহো রঘুপতি কে দাসা॥"
        }
      ]
    },
    // ===== Chaupai 33 =====
    {
      type: "chaupai",
      num: 33,
      totalOfCategory: 40,
      label: { hi: "चौपाई", en: "Chaupai", bn: "চৌপাঈ" },
      lines: [
        {
          hi: "तुम्हरे भजन राम को पावै।",
          en: "Tumhare Bhajan Ram Ko Pave |",
          bn: "তুম্হরে ভজন রাম কো পাবৈ।"
        },
        {
          hi: "जनम जनम के दुख बिसरावै॥",
          en: "Janam Janam Ke Dukh Bisrave ||",
          bn: "জনম জনম কে দুখ বিসরাবৈ॥"
        }
      ]
    },
    // ===== Chaupai 34 =====
    {
      type: "chaupai",
      num: 34,
      totalOfCategory: 40,
      label: { hi: "चौपाई", en: "Chaupai", bn: "চৌপাঈ" },
      lines: [
        {
          hi: "अन्तकाल रघुबर पुर जाई।",
          en: "Antkal Raghubar Pur Jai |",
          bn: "অন্তকাল রঘুবর পুর জাই।"
        },
        {
          hi: "जहाँ जन्म हरिभक्त कहाई॥",
          en: "Jahan Janm Haribhakt Kahai ||",
          bn: "জহাঁ জন্ম হরিভক্ত কহাই॥"
        }
      ]
    },
    // ===== Chaupai 35 =====
    {
      type: "chaupai",
      num: 35,
      totalOfCategory: 40,
      label: { hi: "चौपाई", en: "Chaupai", bn: "চৌপাঈ" },
      lines: [
        {
          hi: "और देवता चित्त न धरई।",
          en: "Aur Devta Chitt Na Dharai |",
          bn: "ঔর দেবতা চিত্ত ন ধরঈ।"
        },
        {
          hi: "हनुमत सेइ सर्ब सुख करई॥",
          en: "Hanumat Sei Sarb Sukh Karai ||",
          bn: "হনুমত সেই সর্ব সুখ করঈ॥"
        }
      ]
    },
    // ===== Chaupai 36 =====
    {
      type: "chaupai",
      num: 36,
      totalOfCategory: 40,
      label: { hi: "चौपाई", en: "Chaupai", bn: "চৌপাঈ" },
      lines: [
        {
          hi: "संकट कटै मिटै सब पीरा।",
          en: "Sankat Kate Mite Sab Pira |",
          bn: "সংকট কটৈ মিটৈ সব পীরা।"
        },
        {
          hi: "जो सुमिरै हनुमत बलबीरा॥",
          en: "Jo Sumirai Hanumat Balbira ||",
          bn: "জো সুমিরৈ হনুমত বলবীরা॥"
        }
      ]
    },
    // ===== Chaupai 37 =====
    {
      type: "chaupai",
      num: 37,
      totalOfCategory: 40,
      label: { hi: "चौपाई", en: "Chaupai", bn: "চৌপাঈ" },
      lines: [
        {
          hi: "जय जय जय हनुमान गोसाईं।",
          en: "Jai Jai Jai Hanuman Gosain |",
          bn: "জয় জয় জয় হনুমান গোসাঈং।"
        },
        {
          hi: "कृपा करहु गुरुदेव की नाईं॥",
          en: "Kripa Karahu Gurudev Ki Naai ||",
          bn: "কৃপা করহু গুরুদেব কী নাঈং॥"
        }
      ]
    },
    // ===== Chaupai 38 =====
    {
      type: "chaupai",
      num: 38,
      totalOfCategory: 40,
      label: { hi: "चौपाई", en: "Chaupai", bn: "চৌপাঈ" },
      lines: [
        {
          hi: "जो सत बार पाठ कर कोई।",
          en: "Jo Sat Bar Path Kar Koi |",
          bn: "জো শত বার পাঠ কর কোই।"
        },
        {
          hi: "छूटहि बंदि महा सुख होई॥",
          en: "Chhutahi Bandi Maha Sukh Hoi ||",
          bn: "ছূটহি বন্দি মহা সুখ হোই॥"
        }
      ]
    },
    // ===== Chaupai 39 =====
    {
      type: "chaupai",
      num: 39,
      totalOfCategory: 40,
      label: { hi: "चौपाई", en: "Chaupai", bn: "চৌপাঈ" },
      lines: [
        {
          hi: "जो यह पढ़ै हनुमान चालीसा।",
          en: "Jo Yah Padhe Hanuman Chalisa |",
          bn: "জো যহ পড়ৈ হনুমান চালীসা।"
        },
        {
          hi: "होय सिद्धि साखी गौरीसा॥",
          en: "Hoye Siddhi Sakhi Gaurisa ||",
          bn: "হোয় সিদ্ধি সাখী গৌরীসা॥"
        }
      ]
    },
    // ===== Chaupai 40 =====
    {
      type: "chaupai",
      num: 40,
      totalOfCategory: 40,
      label: { hi: "चौपाई", en: "Chaupai", bn: "চৌপাঈ" },
      lines: [
        {
          hi: "तुलसीदास सदा हरि चेरा।",
          en: "Tulsidas Sada Hari Chera |",
          bn: "তুলসীদাস সদা হরি চেরা।"
        },
        {
          hi: "कीजै नाथ हृदय महँ डेरा॥",
          en: "Kijai Nath Hriday Mah Dera ||",
          bn: "কীজৈ নাথ হৃদয় মহঁ ডেরা॥"
        }
      ]
    },
    // ===== Closing Doha =====
    {
      type: "doha-end",
      num: 1,
      totalOfCategory: 1,
      label: { hi: "समापन दोहा", en: "Closing Doha", bn: "সমাপন দোহা" },
      lines: [
        {
          hi: "पवनतनय संकट हरन मंगल मूरति रूप।",
          en: "Pawantanay Sankat Haran Mangal Murti Roop |",
          bn: "পবনতনয় সংকট হরন মঙ্গল মূরতি রূপ।"
        },
        {
          hi: "राम लखन सीता सहित हृदय बसहु सुर भूप॥",
          en: "Ram Lakhan Sita Sahit Hriday Basahu Sur Bhoop ||",
          bn: "রাম লখন সীতা সহিত হৃদয় বসহু সুর ভূপ॥"
        }
      ]
    }
  ]
};

/**
 * ==================== Cross-script phonetic normaliser ====================
 * Reduces Devanagari, Bengali or romanised (Latin) text to a canonical
 * consonant skeleton, so one word compares equal whatever script the speech
 * recogniser returns it in:
 *     "ज्ञान" / "জ্ঞান" / "Gyan"   -> "gn"
 *     "बहुत"  / "বহুত"  / "Bahut"  -> "bht"
 *     "जय"    / "জয়"    / "Jai"    -> "j"
 *
 * Rules (each one fixes a mismatch measured against the 417 aligned words):
 *  - Input is NFD-normalised, so precomposed nukta letters (ड़ U+095C,
 *    ড় U+09DC, য় U+09DF ...) become base letter + nukta. Without this the
 *    recogniser's "पढ़" lost its ड़ entirely.
 *  - Indic letters map straight to a canonical consonant; aspirates fold into
 *    the plain consonant (भ->b, ध->d, च/छ->c). Latin digraph rules (bh, sh, kh,
 *    gy ...) run ONLY on Latin runs. Running them on transliterated Indic text
 *    merged real clusters: ब+ह ("bh") became "b", so बहुत != Bahut.
 *  - ज्ञ/জ্ঞ and Latin gy/jn all become "gn". (The old gy->gn rule ran after
 *    y->j and never fired; the old jn->gn rule also hit जनेऊ, जोजन ...)
 *  - Anusvara and chandrabindu both become "n". Hindi recognisers use them
 *    interchangeably (कहाँ / कहां) and romanisations mostly write the nasal as
 *    "n" (Kahan, Nahin, Kandhe), so this is the most consistent choice.
 *  - The skeleton keeps consonants only, repeats collapsed, and is never
 *    padded back with vowels (that made "जय"->"jj" but "Jai"->"jai").
 *    It can be a single letter; the matcher treats such words as weak.
 */
const SCRIPT_TO_LATIN = {
  // Devanagari vowels & matras (discarded by the skeleton, kept by scriptToPhonetic)
  'अ':'a','आ':'a','इ':'i','ई':'i','उ':'u','ऊ':'u','ऋ':'ri','ए':'e','ऐ':'ai','ओ':'o','औ':'au','ऑ':'o','ॐ':'om',
  'ा':'a','ि':'i','ी':'i','ु':'u','ू':'u','ृ':'ri','े':'e','ै':'ai','ो':'o','ौ':'au','ॉ':'o','ॅ':'e',
  'क':'k','ख':'k','ग':'g','घ':'g','ङ':'n',
  'च':'c','छ':'c','ज':'j','झ':'j','ञ':'n',
  'ट':'t','ठ':'t','ड':'d','ढ':'d','ण':'n',
  'त':'t','थ':'t','द':'d','ध':'d','न':'n',
  'प':'p','फ':'p','ब':'b','भ':'b','म':'m',
  'य':'j','र':'r','ल':'l','ळ':'l','व':'b','श':'s','ष':'s','स':'s','ह':'h',
  'ं':'n','ः':'h','ँ':'n','़':'','्':'',
  // Bengali
  'অ':'a','আ':'a','ই':'i','ঈ':'i','উ':'u','ঊ':'u','ঋ':'ri','এ':'e','ঐ':'ai','ও':'o','ঔ':'au',
  'া':'a','ি':'i','ী':'i','ু':'u','ূ':'u','ৃ':'ri','ে':'e','ৈ':'ai','ো':'o','ৌ':'au','ৗ':'u',
  'ক':'k','খ':'k','গ':'g','ঘ':'g','ঙ':'n',
  'চ':'c','ছ':'c','জ':'j','ঝ':'j','ঞ':'n',
  'ট':'t','ঠ':'t','ড':'d','ঢ':'d','ণ':'n',
  'ত':'t','থ':'t','দ':'d','ধ':'d','ন':'n',
  'প':'p','ফ':'p','ব':'b','ভ':'b','ম':'m',
  'য':'j','র':'r','ল':'l','শ':'s','ষ':'s','স':'s','হ':'h',
  'ৎ':'t','ং':'n','ঃ':'h','ঁ':'n','়':'','্':''
};

// Punctuation and separators become word boundaries (danda, double danda, |, hyphen ...)
const PHONETIC_SEPARATORS = /[।॥|,.;:!?'"“”‘’()[\]{}\-–—_/\\]+/g;
// ज्ञ (Devanagari) and জ্ঞ (Bengali) are pronounced "gy" / "gg", romanised "gy"
const JNA_CONJUNCT = /ज्ञ|জ্ঞ/g;

function canonicalLatin(run) {
  return run
    .replace(/gy/g, 'gn').replace(/jn/g, 'gn')          // gyan / jnana ~ ज्ञान
    .replace(/x/g, 'ks').replace(/q/g, 'k').replace(/z/g, 'j').replace(/f/g, 'p')
    .replace(/c(?!h)/g, 'k').replace(/ch+/g, 'c')          // lone c is k; ch/chh is च/छ
    .replace(/sh/g, 's')
    .replace(/([bpkgjdt])h/g, '$1')                        // bh ph kh gh jh dh th -> plain
    .replace(/[vw]/g, 'b').replace(/y/g, 'j');
}

/**
 * Latin approximation of a word or phrase (vowels kept, separators removed).
 */
function scriptToPhonetic(str) {
  if (!str) return '';
  const s = String(str).normalize('NFD').toLowerCase()
    .replace(PHONETIC_SEPARATORS, ' ')
    .replace(JNA_CONJUNCT, 'gn');
  let out = '';
  let latin = '';
  for (const ch of s) {
    if (Object.prototype.hasOwnProperty.call(SCRIPT_TO_LATIN, ch)) {
      if (latin) { out += canonicalLatin(latin); latin = ''; }
      out += SCRIPT_TO_LATIN[ch];
    } else if ((ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9')) {
      latin += ch;
    } else if (ch >= '̀' && ch <= 'ͯ') {
      // combining accent from NFD of IAST text (ā, ś ...): ignore, keep the run going
    } else if (latin) {
      out += canonicalLatin(latin);
      latin = '';
    }
  }
  if (latin) out += canonicalLatin(latin);
  return out;
}

/**
 * Canonical consonant skeleton used for speech matching.
 * Returns '' for punctuation-only tokens such as "|" or "॥".
 */
function phoneticSkeleton(str) {
  const p = scriptToPhonetic(str);
  if (!p) return '';
  const consonants = p.replace(/[aeiou]/g, '').replace(/(.)\1+/g, '$1');
  return consonants || p.replace(/(.)\1+/g, '$1'); // vowel-only word such as "ऐ"
}

function getFlatLines() {
  const lines = [];
  let index = 0;
  
  CHALISA_DATA.verses.forEach((verse, vIdx) => {
    const meaning = (typeof CHALISA_MEANINGS !== 'undefined' && CHALISA_MEANINGS[vIdx]) ? CHALISA_MEANINGS[vIdx] : null;

    verse.lines.forEach((line, lIdx) => {
      const cleanHi = line.hi.replace(/[।॥]/g, '').trim();
      const cleanEn = line.en.replace(/[|]/g, '').trim();
      const cleanBn = line.bn.replace(/[।॥]/g, '').trim();

      const hiWords = cleanHi.split(/\s+/);
      const enWords = cleanEn.split(/\s+/);
      const bnWords = cleanBn.split(/\s+/);

      const maxLen = Math.max(hiWords.length, enWords.length, bnWords.length);
      const wordTokens = [];

      for (let w = 0; w < maxLen; w++) {
        const hw = hiWords[w] || '';
        const ew = enWords[w] || '';
        const bw = bnWords[w] || '';
        wordTokens.push({
          idx: w,
          hi: hw,
          en: ew,
          bn: bw,
          phonetic: scriptToPhonetic(hw || ew),
          skeleton: phoneticSkeleton(hw || ew)
        });
      }

      lines.push({
        index: index++,
        lineInVerse: lIdx + 1,
        verseIndex: vIdx + 1,
        totalVerses: 43,
        verseType: verse.type,
        verseNum: verse.num,
        totalOfCategory: verse.totalOfCategory,
        verseLabel: verse.label,
        hi: line.hi,
        en: line.en,
        bn: line.bn,
        cleanEn: cleanEn.toLowerCase(),
        cleanHi: cleanHi,
        cleanBn: cleanBn,
        meaning: meaning,
        wordTokens: wordTokens
      });
    });
  });
  return lines;
}

if (typeof window !== 'undefined') {
  window.CHALISA_DATA = CHALISA_DATA;
  window.scriptToPhonetic = scriptToPhonetic;
  window.phoneticSkeleton = phoneticSkeleton;
  window.getFlatLines = getFlatLines;
}
if (typeof module !== 'undefined') {
  module.exports = { CHALISA_DATA, scriptToPhonetic, phoneticSkeleton, getFlatLines };
}
