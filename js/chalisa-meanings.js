/**
 * Complete Authentic Bhavarth (Meanings) for Shri Hanuman Chalisa
 * Includes Hindi (सरल हिंदी अर्थ) and English translations for all 43 verses.
 */

const CHALISA_MEANINGS = [
  // 1. Opening Doha 1
  {
    hi: "श्री गुरु महाराज के चरण-कमलों की धूलि से अपने मन रूपी दर्पण को पवित्र करके, मैं श्री रघुवीर के उस निर्मल यश का वर्णन करता हूँ, जो धर्म, अर्थ, काम और मोक्ष—इन चारों फलों को प्रदान करने वाला है।",
    en: "Having cleansed the mirror of my mind with the dust of the holy lotus feet of my Guru, I narrate the pure glory of Lord Rama, which bestows the four fruits of life (Dharma, Artha, Kama, and Moksha)."
  },
  // 2. Opening Doha 2
  {
    hi: "हे पवनपुत्र! मैं स्वयं को बुद्धिहीन जानकर आपका स्मरण करता हूँ। आप मुझे शारीरिक बल, सद्बुद्धि और विद्या प्रदान करें तथा मेरे समस्त क्लेशों और विकारों को हर लें।",
    en: "Knowing myself to be devoid of wisdom, I remember you, O Pawan Kumar (Son of Wind)! Bestow upon me strength, wisdom, and knowledge, and relieve me of all sorrow, afflictions, and imperfections."
  },
  // 3. Chaupai 1
  {
    hi: "हे हनुमान जी! आपकी जय हो। आप ज्ञान और गुणों के अथाह सागर हैं। हे वानर शिरोमणि, तीनों लोकों (स्वर्ग, पृथ्वी, पाताल) में आपकी कीर्ति का प्रकाश फैला हुआ है।",
    en: "Victory to you, O Hanuman, ocean of divine wisdom and boundless virtues! Hail to the supreme leader of the Vanaras, whose glory radiates throughout the three worlds."
  },
  // 4. Chaupai 2
  {
    hi: "आप भगवान श्री राम के परम पावन दूत और अतुलनीय बल के धाम हैं। आप माता अंजना के तेजस्वी पुत्र और पवनसुत के नाम से विख्यात हैं।",
    en: "You are the supreme messenger of Lord Rama, the abode of incomparable might. You are celebrated as the illustrious son of Mother Anjana and the Wind God."
  },
  // 5. Chaupai 3
  {
    hi: "हे महावीर! आप अत्यंत पराक्रमी और वज्र के समान सुदृढ़ अंगों वाले हैं। आप कुबुद्धि (दुर्बुद्धि) को दूर करते हैं और सद्बुद्धि रखने वालों के परम मित्र व सहायक हैं।",
    en: "O supreme warrior of thunderous valour! With limbs as mighty as Indra's thunderbolt, you dispel wickedness and evil thoughts, blessing your devotees with righteous wisdom."
  },
  // 6. Chaupai 4
  {
    hi: "आपका वर्ण कंचन (स्वर्ण) के समान उज्ज्वल है, आप सुंदर दिव्य वस्त्रों से सुशोभित हैं। आपके कानों में सुंदर कुंडल और घुंघराले बाल मनोहारी हैं।",
    en: "Your radiant complexion glows like molten gold, adorned in sacred apparel. Resplendent ear-rings grace your ears, and your curly locks enhance your divine form."
  },
  // 7. Chaupai 5
  {
    hi: "आपके हाथों में वज्र और ध्वजा शोभायमान हैं और आपके कंधे पर पवित्र मूंज का जनेऊ (यज्ञोपवीत) सुशोभित है।",
    en: "In your hands rest the invincible thunderbolt and the divine banner of victory; across your holy shoulder rests the sacred thread of munja grass."
  },
  // 8. Chaupai 6
  {
    hi: "आप भगवान शिव के ही अंशावतार हैं और महाराज केसरी के पुत्र हैं। आपके असीम तेज और प्रताप की वंदना समस्त जगत करता है।",
    en: "You are the incarnation of Lord Shiva and the proud son of Kesari. The entire universe reveres and bows before your radiant glory and majesty."
  },
  // 9. Chaupai 7
  {
    hi: "आप समस्त विद्याओं के ज्ञाता, परम गुणवान और अत्यंत चतुर हैं। भगवान श्री राम के कार्यों को सिद्ध करने के लिए आप सदैव तत्पर रहते हैं।",
    en: "You are the master of all knowledge, immensely virtuous, and sagacious. You are forever eager and devoted to accomplishing the noble mission of Lord Rama."
  },
  // 10. Chaupai 8
  {
    hi: "आप प्रभु श्री राम के चरित्र और कथा को सुनने में परम आनंदित रहते हैं। आपके हृदय में श्री राम, माता सीता और लक्ष्मण जी सदैव वास करते हैं।",
    en: "You revel in the joy of listening to the divine exploits of Lord Rama. Within your holy heart eternally dwell Shri Rama, Mother Sita, and Lakshmana."
  },
  // 11. Chaupai 9
  {
    hi: "आपने अत्यंत सूक्ष्म रूप धारण करके माता जानकी को अपने दर्शन कराए और भीषण विकराल रूप धरकर लंका को भस्म कर दिया।",
    en: "Assuming an atom-sized subtle form, you appeared before Mother Sita in Lanka; assuming a colossal cosmic form, you set the golden fortress of Lanka ablaze."
  },
  // 12. Chaupai 10
  {
    hi: "आपने विकट भीम रूप धारण कर असुरों का संहार किया और भगवान श्री रामचंद्र जी के समस्त कार्यों को सुगमता से संपन्न किया।",
    en: "Assuming a formidable mighty form, you vanquished demonic forces and triumphantly fulfilled every divine endeavor of Lord Rama."
  },
  // 13. Chaupai 11
  {
    hi: "आपने संजीवनी बूटी लाकर लक्ष्मण जी के प्राणों की रक्षा की, जिससे श्री रामचंद्र जी का हृदय परम हर्ष और आनंद से भर गया।",
    en: "Bringing the celestial Sanjeevani herb from the Himalayas, you revived Lakshmana, filling Lord Rama's heart with boundless love and relief."
  },
  // 14. Chaupai 12
  {
    hi: "श्री रघुनाथ जी ने आपकी मुक्तकंठ से प्रशंसा की और स्नेहपूर्वक कहा कि तुम मुझे भरत जैसे अपने प्रिय भाई के समान प्यारे हो।",
    en: "Lord Rama embraced you with deep affection, declaring with tears of joy that you are as beloved to Him as His dearest brother Bharata."
  },
  // 15. Chaupai 13
  {
    hi: "सहस्रों मुख वाले शेषनाग भी आपके यश का गान करते हैं—ऐसा कहकर श्रीपति राम ने आपको अपने कंठ से लगा लिया।",
    en: "'May the thousand-headed serpent Sheshanaga sing your glories!' So praising, Lord Rama affectionately embraced you to His chest."
  },
  // 16. Chaupai 14
  {
    hi: "सनक, सनंदन आदि ऋषिगण, ब्रह्मा जी सहित समस्त देवता, देवर्षि नारद, माता सरस्वती और शेषनाग भी आपका गुणगान करते हैं।",
    en: "The divine sages Sanaka and his brothers, Lord Brahma, celestial gods, Sage Narada, Goddess Saraswati, and the king of serpents all chant your praises."
  },
  // 17. Chaupai 15
  {
    hi: "यमराज, कुबेर, और दसों दिशाओं के रक्षक (दिग्पाल) तथा कोई भी कवि या पंडित आपके पूर्ण यश का वर्णन करने में असमर्थ हैं।",
    en: "Yama (the lord of death), Kubera (the lord of wealth), the guardians of all directions, and the greatest poets and scholars find words insufficient to describe your glory."
  },
  // 18. Chaupai 16
  {
    hi: "आपने सुग्रीव जी का बड़ा उपकार किया; उन्हें श्री राम जी से मिलाया और उन्हें उनका खोया हुआ राज्य व राजपद वापस दिलाया।",
    en: "You rendered monumental assistance to Sugriva by introducing him to Lord Rama, restoring his honor, and crowning him king of Kishkindha."
  },
  // 19. Chaupai 17
  {
    hi: "आपके परामर्श को विभीषण जी ने माना, जिसके फलस्वरूप वे लंका के राजा बने—यह बात संपूर्ण संसार जानता है।",
    en: "Vibhishana heeded your sage counsel, surrendered to Lord Rama, and became the sovereign king of Lanka, as known across the universe."
  },
  // 20. Chaupai 18
  {
    hi: "जो सूर्य सहस्रों योजन की दूरी पर स्थित है, उसे आपने बाल्यकाल में एक मीठा मधुर फल समझकर अनायास ही निगल लिया था।",
    en: "Even as a child, mistaking the blazing sun situated millions of miles away for a ripe sweet fruit, you leaped and swallowed it with celestial ease."
  },
  // 21. Chaupai 19
  {
    hi: "प्रभु श्री राम की दी हुई मुद्रिका (अंगूठी) को अपने मुख में रखकर आपने विशाल समुद्र को सहजता से लांघ लिया, इसमें कोई आश्चर्य नहीं।",
    en: "Holding Lord Rama's signet ring within your mouth, you effortlessly crossed the fathomless ocean, an act of wonder that astounded creation."
  },
  // 22. Chaupai 20
  {
    hi: "संसार में जितने भी अत्यंत कठिन और असाध्य कार्य हैं, वे आपकी अनुकंपा और कृपा से अत्यंत सुगम व सरल हो जाते हैं।",
    en: "Whatever endeavors in this world appear insurmountable and arduous become effortlessly accomplished through your divine grace."
  },
  // 23. Chaupai 21
  {
    hi: "आप श्री राम जी के द्वार के रक्षक और प्रहरी हैं; आपकी आज्ञा अथवा कृपा के बिना प्रभु के दरबार में कोई प्रवेश नहीं कर सकता।",
    en: "You are the sacred gatekeeper of Lord Rama's inner sanctuary; no one can enter or gain His holy grace without your sanction."
  },
  // 24. Chaupai 22
  {
    hi: "आपकी शरण में आने वाले को समस्त सुख-आनंद प्राप्त होते हैं। जिसके रक्षक आप स्वयं हैं, उसे संसार में किसी बात का भय नहीं रहता।",
    en: "Those who seek refuge in you find all joy, peace, and auspiciousness. When protected by your divine might, what fear can touch them?"
  },
  // 25. Chaupai 23
  {
    hi: "अपने अद्वितीय वेग और तेज को केवल आप ही नियंत्रित कर सकते हैं; आपके एक सिंहनाद से तीनों लोक थर-थर कांपने लगते हैं।",
    en: "You alone possess the capacity to harness your own stupendous energy; when you roar in battle, the three worlds tremble with awe."
  },
  // 26. Chaupai 24
  {
    hi: "भूत, प्रेत, पिशाच और समस्त नकारात्मक शक्तियां उस व्यक्ति के निकट भी नहीं फटकतीं, जो आपका 'महावीर' नाम जपता है।",
    en: "Ghosts, evil spirits, and negative entities dare not approach the devotee who continuously chants your holy name 'Mahavira'."
  },
  // 27. Chaupai 25
  {
    hi: "हे वीर हनुमान जी! जो व्यक्ति निरंतर आपके नाम का स्मरण करता है, उसके समस्त रोग, व्याधियां और पीड़ाएं तत्काल नष्ट हो जाती हैं।",
    en: "All diseases, ailments, and tormenting agonies are annihilated for those who unceasingly chant the powerful name of Lord Hanuman."
  },
  // 28. Chaupai 26
  {
    hi: "जो मनुष्य मन, कर्म और वचन से हनुमान जी का ध्यान करता है, हनुमान जी उसे जीवन के प्रत्येक संकट और बाधा से मुक्त करते हैं।",
    en: "Hanuman liberates from all trials, tribulations, and obstacles whoever contemplates Him with purity of mind, word, and deed."
  },
  // 29. Chaupai 27
  {
    hi: "तपस्वी राजा श्री रामचंद्र जी सर्वश्रेष्ठ प्रभु हैं, और आपने उनके समस्त कार्यों को पूर्ण निष्ठा के साथ सिद्ध किया।",
    en: "Supreme Lord Rama is the pinnacle of asceticism and righteousness, and you served Him with absolute fidelity, accomplishing all His missions."
  },
  // 30. Chaupai 28
  {
    hi: "जो कोई भक्त किसी भी कामना के साथ आपके दरबार में आता है, वह अपने जीवन में अविनाशी और दुर्लभ फल प्राप्त करता है।",
    en: "Whoever approaches you with sincere yearning and devotion is blessed with the everlasting nectar of divine fulfillment."
  },
  // 31. Chaupai 29
  {
    hi: "चारों युगों (सत्य, त्रेता, द्वापर, कलि) में आपका प्रताप और तेज अखंड रूप से जगमगाता है; आपकी कीर्ति संपूर्ण जगत में प्रसिद्ध है।",
    en: "Across all four cosmic ages (Satya, Treta, Dvapara, and Kali), your eternal effulgence shines bright, celebrated throughout creation."
  },
  // 32. Chaupai 30
  {
    hi: "आप साधु-संतों, मुनियों और सज्जनों के रक्षक हैं, असुरों और दुष्टों का विनाश करने वाले हैं तथा श्री राम के परम लाड़ले हैं।",
    en: "You are the celestial guardian of saints and righteous seekers, the destroyer of wicked demonic forces, and the darling beloved of Lord Rama."
  },
  // 33. Chaupai 31
  {
    hi: "आपको माता जानकी (सीता जी) ने अष्ट सिद्धियों और नव निधियों के दाता होने का वरदान दिया है, जिससे आप जिसे चाहें उसे यह वैभव प्रदान कर सकते हैं।",
    en: "Mother Sita granted you the boon to bestow the eight supernatural perfections (Ashta Siddhis) and nine divine treasures (Nava Nidhis) upon deserving souls."
  },
  // 34. Chaupai 32
  {
    hi: "आपके पास श्री राम के प्रेम रूपी अमृत का अनमोल खजाना है; आप सदैव रघुनाथ जी के परम सेवक और अनन्य भक्त बने रहते हैं।",
    en: "You hold the eternal elixir of Lord Rama's devotion; may you forever remain the compassionate, humble servant of Shri Raghunath."
  },
  // 35. Chaupai 33
  {
    hi: "आपके भजन और कीर्तन से भक्त को श्री राम जी की प्राप्ति होती है और अनेक जन्मों के संचित दुख-दारिद्र्य दूर हो जाते हैं।",
    en: "Singing your praises leads directly to the divine lotus feet of Lord Rama, erasing the accumulated grief and distress of countless lifetimes."
  },
  // 36. Chaupai 34
  {
    hi: "जीवन के अंत समय में भक्त रघुवर के परम धाम (साकेत/वैकुंठ) को जाता है और यदि वह पुनर्जन्म भी ले, तो श्री हरि का अनन्य भक्त कहलाता है।",
    en: "At the moment of departing this mortal world, your devotee attains the supreme abode of Lord Rama, ever known as a true servant of the Divine."
  },
  // 37. Chaupai 35
  {
    hi: "किसी अन्य देवी-देवता का ध्यान न धरते हुए भी, केवल हनुमान जी की सेवा-आराधना करने से साधक को समस्त सुख और सिद्धियां प्राप्त हो जाती हैं।",
    en: "Without burdening one's mind with myriad rituals, steadfast service to Hanuman alone bestows every conceivable joy and spiritual accomplishment."
  },
  // 38. Chaupai 36
  {
    hi: "हे महाबली हनुमान! जो भी आपके नाम का निरंतर सुमिरन करता है, उसके समस्त संकट कट जाते हैं और सारी पीड़ाएं शांत हो जाती हैं।",
    en: "All perils vanish and all suffering dissolves for the blessed soul who meditates upon the invincible presence of mighty Hanuman."
  },
  // 39. Chaupai 37
  {
    hi: "हे हनुमान जी महाराज! आपकी जय हो, जय हो, जय हो! आप सद्गुरु के समान कृपालु होकर मुझ दीन भक्त पर अपनी कृपा दृष्टि बनाए रखें।",
    en: "Victory, all victory to you, O Lord Hanuman! As my supreme compassionate spiritual master, shower your unending grace upon me."
  },
  // 40. Chaupai 38
  {
    hi: "जो कोई इस पावन हनुमान चालीसा का सौ बार पाठ करता है, वह जन्म-मरण और संसार के समस्त बंधनों से छूटकर परमानंद प्राप्त करता है।",
    en: "Whoever recites this sacred Chalisa a hundred times is liberated from all worldly bondage and attains supreme spiritual freedom and bliss."
  },
  // 41. Chaupai 39
  {
    hi: "जो मनुष्य इस हनुमान चालीसा का श्रद्धापूर्वक पाठ करता है, वह सिद्ध हो जाता है—इस सत्य के साक्षी स्वयं भगवान शिव (गौरीश) हैं।",
    en: "Whoever recites this Hanuman Chalisa attains spiritual perfection and success; Lord Shiva Himself stands witness to this truth."
  },
  // 42. Chaupai 40
  {
    hi: "तुलसीदास जी सदैव भगवान श्री हरि के दास हैं। हे प्रभु! आप मेरे हृदय मंदिर में सदा-सर्वदा निवास कीजिए।",
    en: "Tulsidas is the eternal humble servant of Lord Hari. O Lord of my heart, establish your eternal dwelling within the shrine of my soul."
  },
  // 43. Closing Doha
  {
    hi: "हे संकटमोचन, पवनपुत्र, मंगलमूर्ति रूप! आप श्री राम, लक्ष्मण और माता सीता सहित मेरे हृदय रूपी भवन में सदा के लिए वास कीजिए।",
    en: "O remover of all sorrow, embodiment of auspiciousness, beloved son of the wind! Dwell forever within the temple of my heart along with Shri Rama, Lakshmana, and Mother Sita."
  }
];

if (typeof window !== 'undefined') {
  window.CHALISA_MEANINGS = CHALISA_MEANINGS;
}
if (typeof module !== 'undefined') {
  module.exports = { CHALISA_MEANINGS };
}
