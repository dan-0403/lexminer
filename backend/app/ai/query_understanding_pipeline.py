import re
import unicodedata
from typing import Any


# =========================================================
# COMMON PHRASE NORMALIZATION
# =========================================================
#
# These mappings convert common English, Filipino, and
# Taglish expressions into legal-language concepts.
#
# IMPORTANT:
# Phrase normalization is only query expansion.
# It does NOT determine the actual legal offense.
# The semantic search and retrieved Supreme Court cases
# remain responsible for the final relevance.
# =========================================================

COMMON_PHRASES: dict[str, str] = {

    # =====================================================
    # LABOR / EMPLOYMENT
    # =====================================================

    "fired me": "terminated my employment",
    "fired from work": "terminated from employment",
    "got fired": "terminated from employment",
    "was fired": "terminated from employment",
    "were fired": "terminated from employment",
    "being fired": "termination of employment",
    "getting fired": "termination of employment",
    "fire me": "terminate my employment",
    "will fire me": "threatened termination of employment",
    "remove me from work": "terminate my employment",
    "removed me from work": "terminated my employment",
    "kicked me out of work": "terminated my employment",
    "tinanggal ako sa trabaho": "terminated my employment",
    "tinanggal sa trabaho": "terminated from employment",
    "tinatanggal ako sa trabaho": "termination of employment",
    "tatanggalin ako sa trabaho": "threatened termination of employment",
    "sinibak ako": "terminated my employment",
    "sinisibak ako": "termination of employment",
    "sinibak sa trabaho": "terminated from employment",
    "na fired ako": "terminated from employment",
    "na-fire ako": "terminated from employment",
    "na tanggal ako": "terminated from employment",
    "tanggalin ako": "terminate my employment",
    "ayaw na nila sa akin sa trabaho": "termination of employment",
    "ayaw na nila akong magtrabaho": "termination of employment",

    "without notice": "without prior notice",
    "without hearing my side": "without opportunity to be heard",
    "did not hear my side": "without opportunity to be heard",
    "not allowed to explain": "without opportunity to explain",
    "did not let me explain": "without opportunity to explain",
    "hindi ako pinakinggan": "without opportunity to be heard",
    "hindi pinakinggan ang side ko": "without opportunity to be heard",
    "hindi ako pinayagang magpaliwanag": "without opportunity to explain",
    "walang hearing": "without hearing",
    "walang notice": "without notice",
    "walang abiso": "without notice",

    "did not pay my salary": "withheld wages",
    "did not pay my wages": "withheld wages",
    "did not pay me": "withheld compensation",
    "not paying my salary": "withholding wages",
    "salary was not paid": "unpaid wages",
    "unpaid salary": "unpaid wages",
    "unpaid wages": "unpaid wages",
    "hindi binayaran ang sahod ko": "unpaid wages",
    "hindi ako binayaran": "unpaid compensation",
    "ayaw akong bayaran": "withheld compensation",
    "ayaw magbayad ng sahod": "withheld wages",
    "hindi binibigay ang sahod": "withheld wages",

    "underpaid me": "underpayment of wages",
    "underpaid": "underpayment of wages",
    "kulang ang sahod": "underpayment of wages",
    "mali ang computation ng sahod": "wage computation dispute",
    "hindi binayaran ng overtime": "unpaid overtime",
    "overtime pay was not paid": "unpaid overtime",
    "walang overtime pay": "unpaid overtime",
    "hindi binayaran ang holiday pay": "unpaid holiday pay",
    "hindi binayaran ang 13th month": "unpaid 13th month pay",
    "walang 13th month pay": "unpaid 13th month pay",

    "forced to resign": "constructive dismissal",
    "pinilit akong mag resign": "constructive dismissal",
    "pinilit mag resign": "constructive dismissal",
    "pinipilit akong mag resign": "constructive dismissal",
    "pinapapirma ng resignation": "constructive dismissal",
    "pinapapirma sa resignation": "constructive dismissal",

    "unfair treatment at work": "workplace discrimination",
    "discriminated at work": "employment discrimination",
    "discriminated against me": "employment discrimination",
    "discrimination at work": "employment discrimination",
    "hindi pantay ang trato sa trabaho": "employment discrimination",
    "iba ang trato sa akin sa trabaho": "workplace discrimination",

    "not regularized": "non-regularization of employment",
    "hindi ako nireregular": "non-regularization of employment",
    "hindi ako ginawang regular": "non-regularization of employment",
    "endo": "contractual employment and security of tenure",
    "endo worker": "contractual employment and security of tenure",

    "company did not give separation pay": "unpaid separation pay",
    "walang separation pay": "unpaid separation pay",
    "hindi binigay ang separation pay": "unpaid separation pay",

    "union dispute": "labor union dispute",
    "union problem": "labor union dispute",
    "hindi ako pinasali sa union": "labor union rights",
    "pinagbawalan sumali sa union": "labor union rights",

    # =====================================================
    # THEFT / PROPERTY CRIMES
    # =====================================================

    "stole my phone": "unlawfully took my personal property",
    "stole my cellphone": "unlawfully took my personal property",
    "stole my cell phone": "unlawfully took my personal property",
    "stole my money": "unlawfully took money belonging to another",
    "stole my belongings": "unlawfully took personal property",
    "took my belongings": "unlawfully took personal property",
    "took my things": "unlawfully took personal property",
    "took my stuff": "unlawfully took personal property",
    "took my property": "unlawfully took personal property",
    "stole from me": "unlawful taking of personal property",
    "stole something from me": "unlawful taking of personal property",

    "ninakaw ang cellphone ko": "unlawfully took my personal property",
    "ninakaw ang phone ko": "unlawfully took my personal property",
    "ninakaw ang pera ko": "unlawfully took money belonging to another",
    "ninakaw ang gamit ko": "unlawfully took personal property",
    "ninakaw gamit ko": "unlawfully took personal property",
    "kinuha ang gamit ko": "unlawfully took personal property",
    "kinuha ang pera ko": "unlawfully took money belonging to another",
    "kinuha nang walang pahintulot": "unlawful taking without consent",
    "kinuha yung gamit ko": "unlawfully took personal property",

    "robbed me": "took property through violence or intimidation",
    "robbed us": "took property through violence or intimidation",
    "held me up": "took property through violence or intimidation",
    "holdap": "robbery through violence or intimidation",
    "na holdap": "robbery through violence or intimidation",
    "hinoldap ako": "robbery through violence or intimidation",
    "hinoldap": "robbery through violence or intimidation",
    "tinakot para ibigay ang pera": "took property through intimidation",
    "tinakot ako para ibigay ang pera": "took property through intimidation",
    "sinabihan akong ibigay ang pera": "taking property through intimidation",

    # =====================================================
    # FRAUD / ESTAFA / DECEIT
    # =====================================================

    "scammed me": "defrauded me through deceit",
    "scammed us": "defrauded us through deceit",
    "i got scammed": "defrauded through deceit",
    "got scammed": "defrauded through deceit",
    "scam me": "defraud me through deceit",
    "scam": "fraud or deceit",
    "online scam": "online fraud or deceit",
    "scammer": "fraud or deceit",
    "niloko ako": "defrauded me through deceit",
    "niloko niya ako": "defrauded me through deceit",
    "niloko kami": "defrauded us through deceit",
    "na scam ako": "defrauded through deceit",
    "na-scam ako": "defrauded through deceit",
    "na scam kami": "defrauded through deceit",
    "na-scam kami": "defrauded through deceit",
    "naloko ako": "defrauded me through deceit",
    "niloko para sa pera": "obtained money through deceit",
    "niloko ako para sa pera": "obtained money through deceit",
    "kumuha ng pera gamit ang panloloko": "obtained money through deceit",
    "nanghingi ng pera gamit ang kasinungalingan": "obtained money through false pretenses",

    "tricked me for money": "obtained money through false pretenses",
    "lied to get my money": "obtained money through deceit",
    "lied to me for money": "obtained money through deceit",
    "borrowed money and did not return it": "failure to return money and possible fraud",
    "borrowed money but did not pay": "failure to pay debt",
    "umutang at hindi nagbayad": "failure to pay debt",
    "umutang pero hindi nagbayad": "failure to pay debt",
    "ayaw magbayad ng utang": "failure to pay debt",
    "hindi nagbayad ng utang": "failure to pay debt",

    "misappropriated money": "misappropriation of funds",
    "misused the money": "misappropriation of funds",
    "used the money for himself": "misappropriation of funds",
    "abuse of confidence": "abuse of confidence",
    "inabuso ang tiwala": "abuse of confidence",
    "ginamit ang pera nang walang pahintulot": "misappropriation of funds",

    # =====================================================
    # THREATS / HARASSMENT / VIOLENCE
    # =====================================================

    "harassed me": "subjected me to repeated unwanted conduct",
    "keeps harassing me": "repeated unwanted and intimidating conduct",
    "keeps bothering me": "repeated unwanted conduct",
    "keeps disturbing me": "repeated unwanted conduct",
    "he keeps bothering me": "repeated unwanted conduct",
    "she keeps bothering me": "repeated unwanted conduct",
    "pinapahiya ako": "harassment and humiliation",
    "palaging hina-harass ako": "repeated harassment",
    "palagi akong hina-harass": "repeated harassment",
    "hina-harass ako": "harassment",
    "inaabala ako": "repeated unwanted conduct",
    "ginugulo ako": "repeated unwanted conduct",
    "lagi akong ginugulo": "repeated unwanted conduct",

    "threatened me": "threatened me with harm",
    "threatened to kill me": "issued a threat to kill",
    "said he will kill me": "issued a threat to kill",
    "said she will kill me": "issued a threat to kill",
    "threatened my family": "threatened my family with harm",
    "death threat": "threat of death",
    "death threats": "threat of death",
    "pinagbantaan ako": "threatened me with harm",
    "binantaan ako": "threatened me with harm",
    "babantaan ako": "threatened me with harm",
    "sinabihan akong papatayin": "issued a threat to kill",
    "sinabihan niya akong papatayin": "issued a threat to kill",
    "banta sa buhay": "threat to life",
    "may death threat": "threat of death",

    "hit me": "physically assaulted me",
    "punched me": "physically assaulted me",
    "kicked me": "physically assaulted me",
    "beat me": "physically assaulted me",
    "hurt me": "caused physical harm",
    "injured me": "caused physical injury",
    "sinuntok ako": "physically assaulted me",
    "sinipa ako": "physically assaulted me",
    "sinaktan ako": "physically assaulted me",
    "binugbog ako": "physically assaulted me",
    "binugbog niya ako": "physically assaulted me",
    "sinapak ako": "physically assaulted me",
    "sinugod ako": "physical assault",
    "nanakit sa akin": "physical assault",

    # =====================================================
    # SEXUAL OFFENSES / HARASSMENT
    # =====================================================

    "sexually harassed me": "sexual harassment",
    "sexual harassment at work": "workplace sexual harassment",
    "made sexual remarks": "unwelcome sexual remarks",
    "made sexual comments": "unwelcome sexual conduct",
    "asked for sexual favors": "demanded sexual favors",
    "sexual advances": "unwelcome sexual advances",
    "touched me sexually": "unwanted sexual touching",
    "pinilit akong humalik": "unwanted sexual contact",
    "hinipuan ako": "unwanted sexual touching",
    "hinipuan niya ako": "unwanted sexual touching",
    "bastos na hawak": "unwanted sexual touching",
    "bastos na salita": "sexual harassment or offensive conduct",
    "bastos na biro": "sexual harassment or offensive conduct",

    # =====================================================
    # RAPE / SEXUAL ASSAULT
    # =====================================================

    "raped me": "rape",
    "was raped": "rape",
    "sexual assault": "sexual assault",
    "sexually assaulted me": "sexual assault",
    "forced me to have sex": "non-consensual sexual intercourse",
    "pinilit makipagtalik": "non-consensual sexual intercourse",
    "pinilit akong makipagtalik": "non-consensual sexual intercourse",
    "ginahasa ako": "rape",
    "ginahasa niya ako": "rape",
    "hinalay ako": "rape",

    # =====================================================
    # DRUG OFFENSES
    # =====================================================

    "caught with drugs": "possession of dangerous drugs",
    "found with drugs": "possession of dangerous drugs",
    "had illegal drugs": "possession of dangerous drugs",
    "selling drugs": "illegal drug sale",
    "sold drugs": "illegal drug sale",
    "buying drugs": "illegal drug transaction",
    "bought drugs": "illegal drug transaction",
    "drug possession": "possession of dangerous drugs",
    "may dalang droga": "possession of dangerous drugs",
    "nahulihan ng droga": "possession of dangerous drugs",
    "nahuli dahil sa droga": "drug offense",
    "nahulihan ako ng shabu": "possession of dangerous drugs",
    "nahulihan ng shabu": "possession of dangerous drugs",
    "nagbebenta ng droga": "illegal drug sale",
    "bumibili ng droga": "illegal drug transaction",

    # =====================================================
    # WEAPONS
    # =====================================================

    "carrying an illegal gun": "illegal possession of firearm",
    "possessing an illegal gun": "illegal possession of firearm",
    "had an unlicensed firearm": "illegal possession of firearm",
    "unlicensed gun": "illegal possession of firearm",
    "may baril": "firearm possession",
    "may dalang baril": "firearm possession",
    "walang lisensya ang baril": "illegal possession of firearm",
    "nahulihan ng baril": "possession of firearm",

    # =====================================================
    # LAND / PROPERTY
    # =====================================================

    "took my land": "occupied or claimed property without consent",
    "entered my land": "entered and occupied property without consent",
    "entered my property": "entered property without consent",
    "will not leave my property": "unlawfully withholding possession",
    "tenant will not leave": "tenant unlawfully withholding possession",
    "tenant refuses to leave": "tenant unlawfully withholding possession",
    "refuses to vacate": "unlawful withholding of possession",
    "refuse to vacate": "unlawful withholding of possession",
    "claims my land": "asserts ownership over disputed real property",
    "claims ownership of my land": "asserts ownership over disputed real property",
    "land dispute": "real property ownership dispute",
    "property dispute": "real property dispute",
    "boundary dispute": "boundary dispute involving real property",
    "fence dispute": "boundary dispute involving real property",

    "inaangkin ang lupa ko": "asserts ownership over disputed real property",
    "inaangkin ang lupa": "asserts ownership over disputed real property",
    "kinuha ang lupa ko": "occupied or claimed property without consent",
    "pumasok sa lupa ko": "entered property without consent",
    "pumasok sa property ko": "entered property without consent",
    "ayaw umalis sa lupa ko": "unlawfully withholding possession",
    "ayaw umalis sa bahay": "unlawfully withholding possession",
    "ayaw umalis sa property": "unlawfully withholding possession",
    "ayaw lisanin ang property": "unlawful withholding of possession",
    "ayaw mag vacate": "unlawful withholding of possession",
    "ayaw mag-vacate": "unlawful withholding of possession",

    "tenant stopped paying rent": "nonpayment of rent",
    "tenant did not pay rent": "nonpayment of rent",
    "hindi nagbayad ng upa": "nonpayment of rent",
    "ayaw magbayad ng renta": "nonpayment of rent",
    "ayaw magbayad ng upa": "nonpayment of rent",

    # =====================================================
    # FAMILY LAW
    # =====================================================

    "will not support our child": "failed to provide child support",
    "does not support our child": "failure to provide child support",
    "refuses to support the child": "failure to provide child support",
    "took my child": "custody and parental authority dispute",
    "wants to end our marriage": "marital dissolution dispute",
    "wants to separate": "marital separation dispute",
    "we are separated": "marital separation dispute",
    "child custody problem": "child custody dispute",
    "custody of the child": "child custody dispute",
    "support for the child": "child support",
    "husband does not support us": "failure to provide family support",
    "wife does not support us": "failure to provide family support",

    "ayaw sustentuhan ang anak": "failure to provide child support",
    "ayaw magbigay ng sustento": "failure to provide support",
    "hindi nagbibigay ng sustento": "failure to provide support",
    "hindi nagsusustento": "failure to provide child support",
    "hindi nagsusustento sa anak": "failure to provide child support",
    "kinuha ang anak ko": "custody and parental authority dispute",
    "ayaw ibigay ang anak": "child custody dispute",
    "inaagaw ang anak": "child custody dispute",
    "gusto ng annulment": "marriage annulment dispute",
    "magpapa annul": "marriage annulment dispute",
    "magpapa-annul": "marriage annulment dispute",
    "ayaw na sa asawa": "marital dispute",
    "maghihiwalay": "marital separation dispute",

    # =====================================================
    # ADOPTION / PATERNITY
    # =====================================================

    "adopt my child": "adoption",
    "adopted child": "adoption",
    "adoption problem": "adoption dispute",
    "question about the father of the child": "paternity dispute",
    "who is the father": "paternity dispute",
    "hindi niya anak": "paternity dispute",
    "inaangkin niyang anak niya": "paternity dispute",

    # =====================================================
    # CONSTITUTIONAL RIGHTS
    # =====================================================

    "police searched me": "government search and seizure",
    "police searched my house": "government search and seizure",
    "police searched my car": "government search and seizure",
    "police arrested me": "arrest and deprivation of liberty",
    "arrested without a warrant": "warrantless arrest",
    "searched without a warrant": "warrantless search",
    "without a warrant": "without judicial warrant",
    "illegal arrest": "warrantless or unlawful arrest",
    "illegal search": "unreasonable search and seizure",
    "police took my phone": "government search and seizure",
    "police entered my house": "government search and seizure",

    "hinalughog ng pulis ang bahay": "government search and seizure",
    "hinalughog ang bahay ko": "government search and seizure",
    "hinalughog ako": "government search and seizure",
    "hinuli ako ng pulis": "arrest and deprivation of liberty",
    "nahuli ako": "arrest and deprivation of liberty",
    "hinuli nang walang warrant": "warrantless arrest",
    "pumasok ang pulis sa bahay": "government search and seizure",
    "kinuha ng pulis ang cellphone ko": "government search and seizure",
    "walang warrant": "without judicial warrant",

    "violated my privacy": "right to privacy",
    "privacy violation": "right to privacy",
    "nilabag ang privacy ko": "right to privacy",
    "nilabag ang karapatan ko": "constitutional rights violation",
    "nilabag ang karapatan": "constitutional rights violation",

    # =====================================================
    # DUE PROCESS / EQUAL PROTECTION
    # =====================================================

    "was not given due process": "denial of due process",
    "no due process": "denial of due process",
    "without due process": "denial of due process",
    "not given a chance to explain": "denial of opportunity to be heard",
    "not given a chance to defend myself": "denial of opportunity to be heard",
    "hindi binigyan ng due process": "denial of due process",
    "walang due process": "denial of due process",
    "hindi binigyan ng pagkakataong magpaliwanag": "denial of opportunity to be heard",
    "hindi nabigyan ng pagkakataong ipagtanggol ang sarili": "denial of opportunity to be heard",

    "treated differently": "equal protection issue",
    "treated unfairly compared to others": "equal protection issue",
    "different treatment": "equal protection issue",
    "iba ang trato": "equal protection issue",
    "hindi pantay ang trato": "equal protection issue",

    # =====================================================
    # ADMINISTRATIVE / GOVERNMENT
    # =====================================================

    "government employee": "government employment",
    "public employee": "government employment",
    "public officer": "public office",
    "government official": "public officer",
    "misconduct by government employee": "administrative misconduct",
    "government employee misconduct": "administrative misconduct",
    "dishonest government employee": "administrative dishonesty",
    "administrative case": "administrative proceeding",
    "complaint against a government employee": "administrative complaint",
    "complaint against a government official": "administrative complaint",
    "kaso laban sa government employee": "administrative complaint",
    "kaso laban sa opisyal": "administrative complaint",
    "reklamo sa government employee": "administrative complaint",
    "reklamo sa opisyal": "administrative complaint",

    "corrupt official": "public officer corruption",
    "government corruption": "public officer corruption",
    "bribed a government employee": "bribery",
    "took a bribe": "bribery",
    "tumanggap ng lagay": "bribery",
    "nanghingi ng lagay": "bribery",
    "humingi ng pera para ayusin ang permit": "bribery or corruption",
    "nanghingi ng pera para mapabilis ang proseso": "bribery or corruption",

    # =====================================================
    # CONTRACTS / CIVIL OBLIGATIONS
    # =====================================================

    "did not follow the contract": "breach of contract",
    "breached the contract": "breach of contract",
    "breach our agreement": "breach of contract",
    "did not honor the agreement": "breach of contract",
    "did not honor our agreement": "breach of contract",
    "violated the agreement": "breach of contract",
    "hindi sinunod ang kontrata": "breach of contract",
    "hindi tinupad ang usapan": "breach of contract",
    "hindi tinupad ang kontrata": "breach of contract",
    "hindi tumupad sa kasunduan": "breach of contract",
    "lumabag sa kontrata": "breach of contract",
    "ayaw tuparin ang kontrata": "breach of contract",

    "paid but did not receive the product": "failure to perform contractual obligation",
    "paid but did not receive the service": "failure to perform contractual obligation",
    "binayaran ko pero hindi binigay": "failure to perform contractual obligation",
    "nagbayad pero hindi dumating": "failure to perform contractual obligation",
    "nagbayad pero walang produkto": "failure to perform contractual obligation",
    "nagbayad pero walang serbisyo": "failure to perform contractual obligation",

    # =====================================================
    # DEBT / COLLECTION
    # =====================================================

    "owes me money": "debt obligation",
    "owes money": "debt obligation",
    "refuses to pay me": "failure to pay debt",
    "refuses to pay the debt": "failure to pay debt",
    "did not pay what he owed": "failure to pay debt",
    "hindi binayaran ang utang": "failure to pay debt",
    "ayaw bayaran ang utang": "failure to pay debt",
    "may utang sa akin": "debt obligation",
    "may utang siya sa akin": "debt obligation",
    "hindi nagbayad ng hiniram": "failure to pay debt",

    # =====================================================
    # DAMAGES / NEGLIGENCE
    # =====================================================

    "caused damage to my property": "property damage and civil liability",
    "damaged my property": "property damage and civil liability",
    "damaged my car": "property damage and civil liability",
    "caused an accident": "negligence and civil liability",
    "caused injury through negligence": "negligence causing injury",
    "was negligent": "negligence",
    "negligence caused the accident": "negligence and civil liability",

    "sinira ang gamit ko": "property damage and civil liability",
    "sinira ang property ko": "property damage and civil liability",
    "sinira ang kotse ko": "property damage and civil liability",
    "nakasira ng property": "property damage and civil liability",
    "dahil sa kapabayaan": "negligence",
    "napinsala dahil sa kapabayaan": "negligence causing injury",
    "naaksidente dahil sa kapabayaan": "negligence and civil liability",

    # =====================================================
    # SUCCESSION / INHERITANCE
    # =====================================================

    "inheritance dispute": "succession and inheritance dispute",
    "inheritance problem": "succession and inheritance dispute",
    "fight over inheritance": "inheritance dispute",
    "siblings fighting over inheritance": "inheritance dispute",
    "inheritance was divided unfairly": "succession dispute",
    "mana dispute": "inheritance dispute",
    "problema sa mana": "inheritance dispute",
    "pinag-aawayan ang mana": "inheritance dispute",
    "ayaw ibigay ang mana": "inheritance dispute",
    "inaangkin ang mana": "inheritance dispute",
    "hindi binigay ang mana": "inheritance dispute",

    "will dispute": "last will and testament dispute",
    "dispute over the will": "last will and testament dispute",
    "problema sa last will": "last will and testament dispute",
    "questioned the will": "last will and testament dispute",

    # =====================================================
    # TAX
    # =====================================================

    "tax dispute": "tax dispute",
    "tax problem": "tax dispute",
    "wrong tax assessment": "tax assessment dispute",
    "disagree with the tax assessment": "tax assessment dispute",
    "tax assessment is wrong": "tax assessment dispute",
    "problema sa buwis": "tax dispute",
    "maling tax assessment": "tax assessment dispute",
    "maling computation ng buwis": "tax assessment dispute",
    "ayaw magbayad ng buwis": "tax obligation dispute",

    # =====================================================
    # BUSINESS / COMMERCIAL
    # =====================================================

    "business dispute": "commercial dispute",
    "business partner dispute": "partnership dispute",
    "problem with business partner": "partnership dispute",
    "business partner took the money": "partnership dispute and misappropriation",
    "partner took company money": "partnership dispute and misappropriation",
    "company dispute": "corporate dispute",
    "shareholder dispute": "corporate and shareholder dispute",
    "problem with shareholders": "corporate and shareholder dispute",

    "problema sa business partner": "partnership dispute",
    "away sa business partner": "partnership dispute",
    "kinuha ng partner ang pera ng negosyo": "partnership dispute and misappropriation",
    "problema sa kumpanya": "corporate dispute",
    "away ng magkakapartner": "partnership dispute",

    # =====================================================
    # CYBERCRIME / ONLINE CONDUCT
    # =====================================================

    "hacked my account": "unauthorized access to computer system",
    "hacked my facebook": "unauthorized access to computer system",
    "hacked my account": "unauthorized access to computer system",
    "someone hacked my account": "unauthorized access to computer system",
    "stole my account": "unauthorized access to computer system",
    "online harassment": "cyber harassment",
    "harassed me online": "cyber harassment",
    "threatened me online": "online threat",
    "threatened me on facebook": "online threat",
    "posted my private information": "privacy violation and unauthorized disclosure",
    "posted my photos without permission": "privacy violation",
    "nag hack ng account ko": "unauthorized access to computer system",
    "na hack ang account ko": "unauthorized access to computer system",
    "na-hack ang account ko": "unauthorized access to computer system",
    "hinarass ako online": "cyber harassment",
    "hina-harass ako online": "cyber harassment",
    "pinost ang private information ko": "privacy violation and unauthorized disclosure",
    "pinost ang picture ko nang walang permiso": "privacy violation",

    # =====================================================
    # DEFAMATION / LIBEL / SLANDER
    # =====================================================

    "defamed me": "defamation",
    "defamed me online": "online defamation",
    "posted lies about me": "defamation",
    "spread false accusations": "defamation",
    "accused me of a crime publicly": "defamation",
    "called me a criminal online": "online defamation",
    "siniraan ako": "defamation",
    "siniraan ako online": "online defamation",
    "pinagkalat ang maling paratang": "defamation",
    "pinagbintangan ako online": "online defamation",
    "pinost na magnanakaw ako": "online defamation",

    # =====================================================
    # TRAFFIC / VEHICLE
    # =====================================================

    "car accident": "vehicular accident and civil liability",
    "vehicle accident": "vehicular accident and civil liability",
    "hit by a car": "vehicular accident",
    "hit my car": "vehicular accident and property damage",
    "driver hit me": "vehicular accident",
    "driver left the scene": "hit and run",
    "hit and run": "hit and run",
    "bumangga sa kotse ko": "vehicular accident and property damage",
    "bumangga sa akin": "vehicular accident",
    "nabundol ako": "vehicular accident",
    "tinakbuhan ako pagkatapos bumangga": "hit and run",
    "tumakas pagkatapos ng aksidente": "hit and run",

    # =====================================================
    # CONSUMER / PURCHASE DISPUTES
    # =====================================================

    "bought a defective product": "consumer product liability",
    "defective product": "consumer product liability",
    "seller gave me a defective product": "consumer product liability",
    "seller refused to refund": "consumer refund dispute",
    "refuses to refund": "consumer refund dispute",
    "hindi gumagana ang binili ko": "defective product",
    "sira ang binili ko": "defective product",
    "ayaw i-refund": "consumer refund dispute",
    "ayaw ibalik ang pera": "consumer refund dispute",

    # =====================================================
    # POLICE / CRIMINAL PROCEDURE
    # =====================================================

    "police detained me": "deprivation of liberty",
    "detained without charges": "unlawful detention",
    "kept me in custody": "deprivation of liberty",
    "nakulong ako": "deprivation of liberty and criminal proceeding",
    "ikinulong ako": "deprivation of liberty",
    "kinulong ako nang walang kaso": "unlawful detention",
    "nakulong kahit walang kaso": "unlawful detention",
    "sinampahan ako ng kaso": "criminal prosecution",
    "sinampahan ng kaso": "criminal prosecution",
    "kinasuhan ako": "legal prosecution",
    "kinasuhan": "legal prosecution",
    "may kaso ako": "legal proceeding",
    "may criminal case": "criminal proceeding",

    # =====================================================
    # GENERAL LEGAL LANGUAGE USED BY FILIPINOS
    # =====================================================

    "magkakaso ako": "intent to initiate legal action",
    "kakaso ako": "intent to initiate legal action",
    "kakaso ako sa kanya": "intent to initiate legal action",
    "isusumbong ko": "intent to report legal violation",
    "ire-report ko": "intent to report legal violation",
    "magrereklamo ako": "intent to file a complaint",
    "magrereklamo ako": "intent to file a complaint",
    "ireklamo ko": "intent to file a complaint",
    "pwede ko ba siyang kasuhan": "possible legal action",
    "pwede ba akong magkaso": "possible legal action",
    "ano ang kaso": "possible legal offense",
    "anong kaso ang pwede": "possible legal offense",
    "anong kaso ang puwede": "possible legal offense",
    "may karapatan ba ako": "legal rights inquiry",
    "legal ba ito": "legality inquiry",
    "bawal ba ito": "legality inquiry",
    "labag ba ito sa batas": "legal violation inquiry",
    "ano ang pwede kong gawin": "available legal remedies",
    "ano pwede gawin": "available legal remedies",
    "ano ang dapat kong gawin": "available legal remedies",
}


# =========================================================
# LEGAL DOMAIN DEFINITIONS
# =========================================================

LEGAL_DOMAINS: dict[str, dict[str, list[str]]] = {

    # -----------------------------------------------------
    # LABOR
    # -----------------------------------------------------

    "labor": {
        "triggers": [
            "employee",
            "employer",
            "employment",
            "terminated",
            "termination",
            "dismissed",
            "dismissal",
            "salary",
            "wages",
            "workplace",
            "company",
            "separation pay",
            "labor",
            "union",
            "regular employee",
            "contractual employee",
            "overtime",
            "13th month",
            "holiday pay",
            "leave",
            "resignation",
            "constructive dismissal",
            "security of tenure",
        ],
        "concepts": [
            "labor law",
            "employment law",
            "employer-employee relationship",
            "security of tenure",
            "management prerogative",
            "procedural due process",
            "wages and benefits",
            "termination of employment",
        ],
    },

    # -----------------------------------------------------
    # CRIMINAL
    # -----------------------------------------------------

    "criminal": {
        "triggers": [
            "unlawfully took",
            "violence",
            "intimidation",
            "killed",
            "murder",
            "homicide",
            "assaulted",
            "threatened",
            "harassment",
            "rape",
            "fraud",
            "deceit",
            "drug",
            "weapon",
            "firearm",
            "arrested",
            "robbery",
            "theft",
            "estafa",
            "physical injuries",
            "libel",
            "slander",
            "criminal prosecution",
            "criminal case",
        ],
        "concepts": [
            "criminal law",
            "criminal liability",
            "penal law",
            "elements of the offense",
            "proof beyond reasonable doubt",
            "criminal intent",
            "criminal prosecution",
        ],
    },

    # -----------------------------------------------------
    # PROPERTY
    # -----------------------------------------------------

    "property": {
        "triggers": [
            "land",
            "property",
            "title",
            "tenant",
            "occupied",
            "boundary",
            "possession",
            "ownership",
            "ejectment",
            "lease",
            "rent",
            "real property",
            "house",
            "building",
            "fence",
            "vacate",
            "inheritance",
        ],
        "concepts": [
            "property law",
            "ownership",
            "possession",
            "real property dispute",
            "better right of possession",
            "ejectment",
            "lease",
            "land ownership",
        ],
    },

    # -----------------------------------------------------
    # FAMILY
    # -----------------------------------------------------

    "family": {
        "triggers": [
            "marriage",
            "husband",
            "wife",
            "spouse",
            "child",
            "custody",
            "annulment",
            "adoption",
            "support",
            "parental authority",
            "paternity",
            "separation",
            "family",
        ],
        "concepts": [
            "family law",
            "parental authority",
            "marital rights",
            "best interests of the child",
            "family relations",
            "child support",
            "custody",
            "marriage",
        ],
    },

    # -----------------------------------------------------
    # CONSTITUTIONAL
    # -----------------------------------------------------

    "constitutional": {
        "triggers": [
            "due process",
            "illegal arrest",
            "warrantless arrest",
            "search and seizure",
            "search warrant",
            "freedom",
            "constitutional",
            "equal protection",
            "privacy",
            "government search",
            "government seizure",
            "bill of rights",
            "right to privacy",
            "constitutional rights",
        ],
        "concepts": [
            "constitutional law",
            "Bill of Rights",
            "due process",
            "equal protection",
            "unreasonable search and seizure",
            "right to privacy",
            "constitutional rights",
        ],
    },

    # -----------------------------------------------------
    # ADMINISTRATIVE
    # -----------------------------------------------------

    "administrative": {
        "triggers": [
            "public officer",
            "government employee",
            "government official",
            "misconduct",
            "administrative case",
            "dishonesty",
            "civil service",
            "judge",
            "lawyer",
            "professional responsibility",
            "administrative complaint",
            "disciplinary proceeding",
        ],
        "concepts": [
            "administrative law",
            "administrative liability",
            "public office",
            "professional responsibility",
            "disciplinary proceeding",
            "civil service law",
        ],
    },

    # -----------------------------------------------------
    # CIVIL / OBLIGATIONS
    # -----------------------------------------------------

    "civil_obligations": {
        "triggers": [
            "obligation",
            "debt",
            "agreement",
            "contract",
            "breach of contract",
            "damages",
            "compensation",
            "negligence",
            "civil liability",
            "payment",
            "refund",
        ],
        "concepts": [
            "civil law",
            "law on obligations and contracts",
            "breach of contract",
            "civil liability",
            "damages",
            "compensation",
        ],
    },

    # -----------------------------------------------------
    # SUCCESSION
    # -----------------------------------------------------

    "succession": {
        "triggers": [
            "inheritance",
            "inherit",
            "heir",
            "heirs",
            "estate",
            "will",
            "testament",
            "succession",
            "mana",
            "property of the deceased",
        ],
        "concepts": [
            "succession law",
            "inheritance",
            "estate",
            "heirs",
            "last will and testament",
            "legitime",
            "succession dispute",
        ],
    },

    # -----------------------------------------------------
    # TAX
    # -----------------------------------------------------

    "tax": {
        "triggers": [
            "tax",
            "taxes",
            "tax assessment",
            "tax liability",
            "buwis",
            "taxpayer",
            "revenue",
            "tax collection",
        ],
        "concepts": [
            "tax law",
            "tax assessment",
            "tax liability",
            "tax collection",
            "taxpayer rights",
        ],
    },

    # -----------------------------------------------------
    # COMMERCIAL / CORPORATE
    # -----------------------------------------------------

    "commercial": {
        "triggers": [
            "business",
            "company",
            "corporation",
            "corporate",
            "shareholder",
            "stockholder",
            "partnership",
            "business partner",
            "commercial",
            "shares",
            "corporate dispute",
        ],
        "concepts": [
            "commercial law",
            "corporate law",
            "partnership law",
            "shareholder rights",
            "corporate governance",
            "business dispute",
        ],
    },

    # -----------------------------------------------------
    # CYBER / DATA PRIVACY
    # -----------------------------------------------------

    "cybercrime": {
        "triggers": [
            "computer",
            "online",
            "internet",
            "hacked",
            "hack",
            "account",
            "cyber",
            "online harassment",
            "online threat",
            "unauthorized access",
            "private information",
            "personal data",
        ],
        "concepts": [
            "cybercrime law",
            "computer-related offenses",
            "unauthorized access",
            "online harassment",
            "online fraud",
            "data privacy",
            "privacy violation",
        ],
    },

    # -----------------------------------------------------
    # INTELLECTUAL PROPERTY
    # -----------------------------------------------------

    "intellectual_property": {
        "triggers": [
            "copyright",
            "trademark",
            "patent",
            "invention",
            "intellectual property",
            "brand",
            "logo",
            "pirated",
            "piracy",
            "copied my work",
            "copied my design",
        ],
        "concepts": [
            "intellectual property law",
            "copyright",
            "trademark",
            "patent",
            "infringement",
            "intellectual property rights",
        ],
    },

    # -----------------------------------------------------
    # CONSUMER
    # -----------------------------------------------------

    "consumer": {
        "triggers": [
            "consumer",
            "customer",
            "defective product",
            "refund",
            "seller",
            "product",
            "purchase",
            "warranty",
            "goods",
            "service",
        ],
        "concepts": [
            "consumer protection",
            "consumer rights",
            "defective product",
            "refund",
            "warranty",
            "seller liability",
        ],
    },

    # -----------------------------------------------------
    # TRANSPORT / VEHICULAR
    # -----------------------------------------------------

    "transport": {
        "triggers": [
            "car accident",
            "vehicle accident",
            "driver",
            "vehicle",
            "collision",
            "hit and run",
            "traffic accident",
            "vehicular accident",
            "motorcycle",
            "truck",
            "bus",
            "jeepney",
            "taxi",
        ],
        "concepts": [
            "transportation law",
            "vehicular accident",
            "negligence",
            "civil liability",
            "quasi-delict",
            "driver liability",
        ],
    },
}


# =========================================================
# LEGAL ISSUE DEFINITIONS
# =========================================================

LEGAL_ISSUES: dict[str, dict[str, list[str]]] = {

    # =====================================================
    # LABOR
    # =====================================================

    "illegal_dismissal": {
        "triggers": [
            "terminated my employment",
            "termination from employment",
            "dismissed from work",
            "fired without cause",
            "unjust termination",
            "security of tenure",
            "constructive dismissal",
            "forced to resign",
        ],
        "concepts": [
            "illegal dismissal",
            "termination of employment",
            "security of tenure",
            "just cause",
            "authorized cause",
            "constructive dismissal",
        ],
    },

    "dismissal_due_process": {
        "triggers": [
            "without opportunity to be heard",
            "without opportunity to explain",
            "termination without notice",
            "without hearing",
            "no notice of termination",
            "without due process",
            "no due process",
        ],
        "concepts": [
            "procedural due process in termination",
            "twin-notice requirement",
            "notice and hearing",
            "opportunity to be heard",
        ],
    },

    "unpaid_wages": {
        "triggers": [
            "unpaid wages",
            "withheld wages",
            "unpaid salary",
            "withheld compensation",
            "underpayment of wages",
            "unpaid overtime",
            "unpaid holiday pay",
        ],
        "concepts": [
            "wage claims",
            "unpaid wages",
            "wage recovery",
            "labor standards",
            "employee compensation",
        ],
    },

    "separation_pay": {
        "triggers": [
            "unpaid separation pay",
            "separation pay",
            "termination pay",
        ],
        "concepts": [
            "separation pay",
            "termination benefits",
            "employee benefits",
        ],
    },

    "constructive_dismissal": {
        "triggers": [
            "forced to resign",
            "pinilit akong mag resign",
            "pinapapirma ng resignation",
            "hostile working conditions",
            "unreasonable working conditions",
        ],
        "concepts": [
            "constructive dismissal",
            "involuntary resignation",
            "security of tenure",
        ],
    },

    # =====================================================
    # HARASSMENT
    # =====================================================

    "harassment": {
        "triggers": [
            "repeated unwanted conduct",
            "unwanted and intimidating conduct",
            "harassment",
            "intimidating conduct",
            "repeatedly bothering",
            "repeated disturbance",
        ],
        "concepts": [
            "harassment",
            "unjust vexation",
            "disturbance",
            "annoyance",
            "unwanted conduct",
        ],
    },

    "sexual_harassment": {
        "triggers": [
            "sexual advances",
            "sexual request",
            "unwanted sexual conduct",
            "sexual touching",
            "sexual remarks",
            "workplace sexual harassment",
            "sexual harassment",
        ],
        "concepts": [
            "sexual harassment",
            "gender-based sexual harassment",
            "unwelcome sexual conduct",
            "authority influence",
            "moral ascendancy",
        ],
    },

    # =====================================================
    # THREATS
    # =====================================================

    "grave_threats": {
        "triggers": [
            "threat to kill",
            "threatened me with harm",
            "threatened my family",
            "death threat",
            "issued a threat",
            "threat of death",
        ],
        "concepts": [
            "grave threats",
            "light threats",
            "threat of a crime",
            "criminal intimidation",
        ],
    },

    # =====================================================
    # PHYSICAL INJURIES
    # =====================================================

    "physical_injuries": {
        "triggers": [
            "physically assaulted",
            "caused physical harm",
            "hit and injured",
            "beat me",
            "physical injuries",
            "punched me",
            "kicked me",
            "sinuntok ako",
            "sinipa ako",
            "binugbog ako",
        ],
        "concepts": [
            "physical injuries",
            "assault",
            "bodily harm",
            "criminal liability for physical injury",
        ],
    },

    # =====================================================
    # HOMICIDE / MURDER
    # =====================================================

    "homicide": {
        "triggers": [
            "killed",
            "killed a person",
            "caused death",
            "death of a person",
            "homicide",
            "pagpatay",
            "pumatay",
            "pinatay",
        ],
        "concepts": [
            "homicide",
            "unlawful killing",
            "criminal liability for death",
            "elements of homicide",
        ],
    },

    "murder": {
        "triggers": [
            "murder",
            "murdered",
            "murder case",
            "treachery",
            "evident premeditation",
            "cruelty",
            "pinatay nang may pagtataksil",
            "pinatay sa paraang treachery",
        ],
        "concepts": [
            "murder",
            "qualifying circumstances",
            "treachery",
            "evident premeditation",
            "criminal liability for murder",
        ],
    },

    # =====================================================
    # THEFT / ROBBERY
    # =====================================================

    "theft": {
        "triggers": [
            "unlawfully took my personal property",
            "unlawfully took money",
            "took personal property without consent",
            "stole property",
            "intent to gain",
            "ninakaw",
            "kinuha nang walang pahintulot",
        ],
        "concepts": [
            "theft",
            "qualified theft",
            "unlawful taking",
            "personal property belonging to another",
            "intent to gain",
        ],
    },

    "robbery": {
        "triggers": [
            "through violence or intimidation",
            "took property through violence",
            "took property through intimidation",
            "robbery",
            "holdap",
            "hinoldap",
        ],
        "concepts": [
            "robbery",
            "unlawful taking",
            "violence or intimidation",
            "intent to gain",
        ],
    },

    # =====================================================
    # ESTAFA / FRAUD
    # =====================================================

    "estafa": {
        "triggers": [
            "defrauded me through deceit",
            "obtained money through false pretenses",
            "fraud through deception",
            "misappropriated money",
            "abuse of confidence",
            "niloko ako",
            "na scam ako",
            "defrauded",
        ],
        "concepts": [
            "estafa",
            "fraud",
            "deceit",
            "false pretenses",
            "damage or prejudice",
            "abuse of confidence",
        ],
    },

    "misappropriation": {
        "triggers": [
            "misappropriated money",
            "misused the money",
            "used the money for himself",
            "used the money without permission",
            "inabuso ang tiwala",
        ],
        "concepts": [
            "misappropriation",
            "conversion",
            "abuse of confidence",
            "fraud",
        ],
    },

    # =====================================================
    # EJECTMENT
    # =====================================================

    "unlawful_detainer": {
        "triggers": [
            "unlawfully withholding possession",
            "tenant unlawfully withholding possession",
            "refuses to leave the property",
            "continued possession after demand",
            "refuses to vacate",
            "tenant refuses to leave",
            "ayaw umalis sa property",
            "ayaw mag vacate",
        ],
        "concepts": [
            "unlawful detainer",
            "ejectment",
            "unlawful withholding of possession",
            "demand to vacate",
        ],
    },

    "forcible_entry": {
        "triggers": [
            "entered and occupied property without consent",
            "occupied property by force",
            "deprived me of possession",
            "entered the property secretly",
            "entered my property without consent",
            "pumasok sa lupa ko",
        ],
        "concepts": [
            "forcible entry",
            "ejectment",
            "prior physical possession",
            "dispossession by force",
            "dispossession by strategy or stealth",
        ],
    },

    # =====================================================
    # OWNERSHIP / LAND
    # =====================================================

    "ownership_dispute": {
        "triggers": [
            "claims ownership over disputed property",
            "asserts ownership over disputed real property",
            "land title dispute",
            "ownership conflict",
            "claims my land",
            "inaangkin ang lupa",
        ],
        "concepts": [
            "ownership dispute",
            "quieting of title",
            "reconveyance",
            "certificate of title",
            "better right of ownership",
        ],
    },

    "boundary_dispute": {
        "triggers": [
            "boundary dispute",
            "property boundary",
            "land boundary",
            "fence dispute",
            "boundary conflict",
        ],
        "concepts": [
            "boundary dispute",
            "property boundaries",
            "ownership",
            "possession",
            "real property dispute",
        ],
    },

    "lease_dispute": {
        "triggers": [
            "tenant",
            "rent",
            "lease",
            "nonpayment of rent",
            "tenant refuses to leave",
            "hindi nagbayad ng upa",
        ],
        "concepts": [
            "lease contract",
            "landlord-tenant dispute",
            "nonpayment of rent",
            "ejectment",
            "unlawful detainer",
        ],
    },

    # =====================================================
    # FAMILY
    # =====================================================

    "child_support": {
        "triggers": [
            "failed to provide child support",
            "failure to provide child support",
            "does not support our child",
            "hindi nagsusustento",
            "hindi nagsusustento sa anak",
            "ayaw magbigay ng sustento",
        ],
        "concepts": [
            "child support",
            "support obligation",
            "family support",
            "parental obligations",
        ],
    },

    "child_custody": {
        "triggers": [
            "custody of the child",
            "child custody",
            "took my child",
            "refuses to return my child",
            "kinuha ang anak ko",
            "inaagaw ang anak",
        ],
        "concepts": [
            "child custody",
            "parental authority",
            "best interests of the child",
            "parental rights",
        ],
    },

    "annulment": {
        "triggers": [
            "annulment",
            "annul the marriage",
            "marriage annulment",
            "magpapa annul",
            "magpapa-annul",
        ],
        "concepts": [
            "annulment",
            "marriage",
            "validity of marriage",
            "family relations",
        ],
    },

    "paternity": {
        "triggers": [
            "paternity",
            "father of the child",
            "question of fatherhood",
            "hindi niya anak",
            "inaangkin niyang anak niya",
        ],
        "concepts": [
            "paternity",
            "filiation",
            "parentage",
            "family relations",
        ],
    },

    # =====================================================
    # CONSTITUTIONAL
    # =====================================================

    "illegal_search": {
        "triggers": [
            "government search and seizure",
            "search without judicial warrant",
            "police searched",
            "unreasonable search",
            "warrantless search",
            "searched without a warrant",
        ],
        "concepts": [
            "unreasonable search and seizure",
            "search warrant",
            "exclusionary rule",
            "plain view doctrine",
            "warrantless search",
        ],
    },

    "illegal_arrest": {
        "triggers": [
            "arrest and deprivation of liberty",
            "arrested without warrant",
            "illegal arrest",
            "warrantless arrest",
            "hinuli nang walang warrant",
        ],
        "concepts": [
            "warrantless arrest",
            "illegal arrest",
            "in flagrante delicto arrest",
            "hot pursuit arrest",
        ],
    },

    "due_process": {
        "triggers": [
            "denial of due process",
            "without due process",
            "no due process",
            "not given a chance to explain",
            "hindi binigyan ng due process",
            "walang due process",
        ],
        "concepts": [
            "due process",
            "procedural due process",
            "substantive due process",
            "opportunity to be heard",
        ],
    },

    "equal_protection": {
        "triggers": [
            "equal protection issue",
            "treated differently",
            "different treatment",
            "hindi pantay ang trato",
            "iba ang trato",
        ],
        "concepts": [
            "equal protection",
            "equal protection of the laws",
            "classification",
            "constitutional rights",
        ],
    },

    "privacy": {
        "triggers": [
            "right to privacy",
            "privacy violation",
            "violated my privacy",
            "nilabag ang privacy ko",
            "private information",
        ],
        "concepts": [
            "right to privacy",
            "constitutional privacy",
            "data privacy",
            "privacy violation",
        ],
    },

    # =====================================================
    # ADMINISTRATIVE
    # =====================================================

    "administrative_misconduct": {
        "triggers": [
            "administrative misconduct",
            "government employee misconduct",
            "misconduct by government employee",
            "administrative case",
            "administrative complaint",
        ],
        "concepts": [
            "administrative liability",
            "grave misconduct",
            "simple misconduct",
            "disciplinary proceedings",
        ],
    },

    "administrative_dishonesty": {
        "triggers": [
            "dishonest government employee",
            "administrative dishonesty",
            "dishonesty",
            "falsified government document",
        ],
        "concepts": [
            "administrative dishonesty",
            "falsification",
            "administrative liability",
            "civil service law",
        ],
    },

    # =====================================================
    # CONTRACTS
    # =====================================================

    "breach_of_contract": {
        "triggers": [
            "breach of contract",
            "did not follow the contract",
            "did not honor the agreement",
            "violated the agreement",
            "hindi sinunod ang kontrata",
            "hindi tinupad ang kontrata",
            "hindi tumupad sa kasunduan",
            "lumabag sa kontrata",
        ],
        "concepts": [
            "breach of contract",
            "contractual obligations",
            "performance of contract",
            "damages for breach",
        ],
    },

    "debt_collection": {
        "triggers": [
            "failure to pay debt",
            "owes me money",
            "refuses to pay the debt",
            "did not pay what he owed",
            "hindi binayaran ang utang",
            "ayaw bayaran ang utang",
            "may utang sa akin",
        ],
        "concepts": [
            "debt obligation",
            "collection of sum of money",
            "breach of obligation",
            "civil liability",
        ],
    },

    # =====================================================
    # NEGLIGENCE / DAMAGES
    # =====================================================

    "negligence": {
        "triggers": [
            "negligence",
            "was negligent",
            "caused an accident",
            "caused injury through negligence",
            "dahil sa kapabayaan",
            "napinsala dahil sa kapabayaan",
        ],
        "concepts": [
            "negligence",
            "quasi-delict",
            "civil liability",
            "damages",
            "duty of care",
        ],
    },

    "property_damage": {
        "triggers": [
            "damaged my property",
            "caused damage to my property",
            "damaged my car",
            "sinira ang property ko",
            "sinira ang gamit ko",
            "sinira ang kotse ko",
        ],
        "concepts": [
            "property damage",
            "actual damages",
            "civil liability",
            "damages",
        ],
    },

    # =====================================================
    # SUCCESSION
    # =====================================================

    "inheritance": {
        "triggers": [
            "inheritance dispute",
            "inheritance problem",
            "fight over inheritance",
            "siblings fighting over inheritance",
            "mana dispute",
            "problema sa mana",
            "pinag-aawayan ang mana",
            "ayaw ibigay ang mana",
        ],
        "concepts": [
            "succession",
            "inheritance",
            "estate",
            "heirs",
            "legitime",
            "succession dispute",
        ],
    },

    "will_dispute": {
        "triggers": [
            "will dispute",
            "dispute over the will",
            "last will and testament dispute",
            "questioned the will",
            "problema sa last will",
        ],
        "concepts": [
            "last will and testament",
            "probate",
            "testamentary succession",
            "validity of will",
        ],
    },

    # =====================================================
    # TAX
    # =====================================================

    "tax_assessment": {
        "triggers": [
            "wrong tax assessment",
            "tax assessment dispute",
            "disagree with the tax assessment",
            "maling tax assessment",
            "maling computation ng buwis",
        ],
        "concepts": [
            "tax assessment",
            "tax liability",
            "taxpayer rights",
            "tax collection",
        ],
    },

    # =====================================================
    # CORPORATE / BUSINESS
    # =====================================================

    "partnership_dispute": {
        "triggers": [
            "business partner dispute",
            "problem with business partner",
            "partnership dispute",
            "business partner took the money",
            "problema sa business partner",
            "away sa business partner",
            "away ng magkakapartner",
        ],
        "concepts": [
            "partnership law",
            "partnership dispute",
            "fiduciary duties",
            "accounting between partners",
        ],
    },

    "corporate_dispute": {
        "triggers": [
            "corporate dispute",
            "company dispute",
            "shareholder dispute",
            "shareholder rights",
            "stockholder dispute",
        ],
        "concepts": [
            "corporate law",
            "corporate governance",
            "shareholder rights",
            "stockholder rights",
        ],
    },

    # =====================================================
    # CYBERCRIME
    # =====================================================

    "unauthorized_access": {
        "triggers": [
            "hacked my account",
            "someone hacked my account",
            "unauthorized access",
            "hacked my facebook",
            "na hack ang account ko",
            "na-hack ang account ko",
        ],
        "concepts": [
            "unauthorized access",
            "computer-related offense",
            "cybercrime",
            "computer system security",
        ],
    },

    "online_defamation": {
        "triggers": [
            "defamed me online",
            "posted lies about me",
            "spread false accusations",
            "called me a criminal online",
            "siniraan ako online",
            "pinagbintangan ako online",
        ],
        "concepts": [
            "online libel",
            "cybercrime",
            "defamation",
            "libel",
        ],
    },

    "privacy_violation": {
        "triggers": [
            "posted my private information",
            "posted my photos without permission",
            "privacy violation",
            "private information",
            "pinost ang private information ko",
            "pinost ang picture ko nang walang permiso",
        ],
        "concepts": [
            "data privacy",
            "privacy violation",
            "unauthorized disclosure",
            "personal data",
        ],
    },

    # =====================================================
    # INTELLECTUAL PROPERTY
    # =====================================================

    "copyright_infringement": {
        "triggers": [
            "copyright",
            "copied my work",
            "copied my design",
            "pirated",
            "piracy",
        ],
        "concepts": [
            "copyright infringement",
            "copyright ownership",
            "intellectual property rights",
        ],
    },

    "trademark_infringement": {
        "triggers": [
            "trademark",
            "copied my brand",
            "copied my logo",
            "used my brand",
            "brand infringement",
        ],
        "concepts": [
            "trademark infringement",
            "trademark rights",
            "intellectual property",
            "unfair competition",
        ],
    },

    # =====================================================
    # CONSUMER
    # =====================================================

    "defective_product": {
        "triggers": [
            "defective product",
            "bought a defective product",
            "seller gave me a defective product",
            "sira ang binili ko",
            "hindi gumagana ang binili ko",
        ],
        "concepts": [
            "consumer protection",
            "defective product",
            "product liability",
            "consumer rights",
        ],
    },

    "refund_dispute": {
        "triggers": [
            "seller refused to refund",
            "refuses to refund",
            "ayaw i-refund",
            "ayaw ibalik ang pera",
        ],
        "concepts": [
            "consumer refund",
            "consumer rights",
            "seller obligations",
            "consumer protection",
        ],
    },

    # =====================================================
    # VEHICULAR
    # =====================================================

    "vehicular_accident": {
        "triggers": [
            "car accident",
            "vehicle accident",
            "hit by a car",
            "driver hit me",
            "vehicular accident",
            "bumangga sa kotse ko",
            "bumangga sa akin",
            "nabundol ako",
        ],
        "concepts": [
            "vehicular accident",
            "negligence",
            "quasi-delict",
            "civil liability",
            "damages",
        ],
    },

    "hit_and_run": {
        "triggers": [
            "hit and run",
            "driver left the scene",
            "driver fled",
            "tinakbuhan ako pagkatapos bumangga",
            "tumakas pagkatapos ng aksidente",
        ],
        "concepts": [
            "hit and run",
            "vehicular accident",
            "driver liability",
            "civil liability",
        ],
    },
}


# =========================================================
# FACTUAL SCENARIO DEFINITIONS
# =========================================================

LEGAL_SCENARIOS: dict[str, dict[str, Any]] = {

    # =====================================================
    # LABOR
    # =====================================================

    "employee_terminated_without_due_process": {
        "required_groups": [
            [
                "terminated",
                "dismissed",
                "termination",
                "fired",
            ],
            [
                "without opportunity to be heard",
                "without opportunity to explain",
                "without notice",
                "without hearing",
                "without due process",
            ],
        ],
        "concepts": [
            "illegal dismissal",
            "procedural due process",
            "twin-notice requirement",
            "termination without notice and hearing",
        ],
    },

    "employee_forced_to_resign": {
        "required_groups": [
            [
                "forced to resign",
                "pinilit akong mag resign",
                "pinapapirma ng resignation",
                "pinipilit akong mag resign",
            ],
        ],
        "concepts": [
            "constructive dismissal",
            "involuntary resignation",
            "security of tenure",
        ],
    },

    "employee_not_paid_wages": {
        "required_groups": [
            [
                "unpaid wages",
                "unpaid salary",
                "withheld wages",
                "hindi ako binayaran",
                "hindi binayaran ang sahod ko",
            ],
        ],
        "concepts": [
            "unpaid wages",
            "labor standards",
            "employee compensation",
        ],
    },

    # =====================================================
    # HARASSMENT / THREATS
    # =====================================================

    "person_subject_to_unwanted_harassment": {
        "required_groups": [
            [
                "repeated unwanted conduct",
                "unwanted and intimidating conduct",
                "harassment",
                "intimidating conduct",
                "repeated harassment",
            ],
        ],
        "concepts": [
            "harassment",
            "unjust vexation",
            "disturbance",
            "annoyance",
        ],
    },

    "person_threatened_with_harm": {
        "required_groups": [
            [
                "threat to kill",
                "threatened me with harm",
                "death threat",
                "issued a threat",
                "threat of death",
            ],
        ],
        "concepts": [
            "grave threats",
            "light threats",
            "criminal intimidation",
        ],
    },

    "person_physically_assaulted": {
        "required_groups": [
            [
                "physically assaulted",
                "caused physical harm",
                "hit and injured",
                "beat me",
                "sinuntok ako",
                "sinipa ako",
                "binugbog ako",
            ],
        ],
        "concepts": [
            "physical injuries",
            "assault",
            "bodily harm",
        ],
    },

    # =====================================================
    # THEFT / ROBBERY
    # =====================================================

    "personal_property_taken_without_consent": {
        "required_groups": [
            [
                "unlawfully took",
                "took personal property",
                "stole property",
                "ninakaw",
                "kinuha nang walang pahintulot",
            ],
        ],
        "concepts": [
            "theft",
            "qualified theft",
            "robbery",
            "unlawful taking",
            "intent to gain",
        ],
    },

    "property_taken_through_violence": {
        "required_groups": [
            [
                "violence or intimidation",
                "took property through violence",
                "took property through intimidation",
                "robbery",
                "holdap",
                "hinoldap",
            ],
        ],
        "concepts": [
            "robbery",
            "violence or intimidation",
            "unlawful taking",
            "intent to gain",
        ],
    },

    # =====================================================
    # ESTAFA
    # =====================================================

    "money_obtained_through_deception": {
        "required_groups": [
            [
                "defrauded",
                "false pretenses",
                "fraud through deception",
                "obtained money",
                "niloko ako",
                "na scam ako",
            ],
            [
                "deceit",
                "false pretenses",
                "deception",
                "abuse of confidence",
            ],
        ],
        "concepts": [
            "estafa",
            "fraud",
            "deceit",
            "damage or prejudice",
        ],
    },

    # =====================================================
    # PROPERTY / EJECTMENT
    # =====================================================

    "occupant_refuses_to_vacate_property": {
        "required_groups": [
            [
                "withholding possession",
                "refuses to leave",
                "tenant",
                "ayaw umalis",
            ],
            [
                "property",
                "possession",
                "vacate",
                "lupa",
                "bahay",
            ],
        ],
        "concepts": [
            "unlawful detainer",
            "ejectment",
            "demand to vacate",
            "unlawful withholding of possession",
        ],
    },

    "person_dispossessed_of_real_property": {
        "required_groups": [
            [
                "occupied property without consent",
                "entered and occupied property",
                "deprived me of possession",
                "pumasok sa lupa ko",
                "pumasok sa property ko",
            ],
        ],
        "concepts": [
            "forcible entry",
            "ejectment",
            "prior physical possession",
            "dispossession",
        ],
    },

    "land_ownership_dispute": {
        "required_groups": [
            [
                "claims ownership",
                "asserts ownership",
                "claims my land",
                "inaangkin ang lupa",
                "land title dispute",
            ],
            [
                "land",
                "property",
                "title",
                "real property",
                "lupa",
            ],
        ],
        "concepts": [
            "ownership dispute",
            "quieting of title",
            "reconveyance",
            "certificate of title",
            "better right of ownership",
        ],
    },

    # =====================================================
    # FAMILY
    # =====================================================

    "parent_fails_to_support_child": {
        "required_groups": [
            [
                "failed to provide child support",
                "does not support our child",
                "hindi nagsusustento",
                "ayaw magbigay ng sustento",
            ],
        ],
        "concepts": [
            "child support",
            "support obligation",
            "parental obligations",
        ],
    },

    "parents_dispute_child_custody": {
        "required_groups": [
            [
                "child custody",
                "custody of the child",
                "kinuha ang anak ko",
                "inaagaw ang anak",
            ],
        ],
        "concepts": [
            "child custody",
            "parental authority",
            "best interests of the child",
        ],
    },

    # =====================================================
    # POLICE / CONSTITUTIONAL
    # =====================================================

    "person_searched_without_warrant": {
        "required_groups": [
            [
                "searched without a warrant",
                "warrantless search",
                "government search",
                "police searched",
                "hinalughog",
            ],
        ],
        "concepts": [
            "unreasonable search and seizure",
            "warrantless search",
            "search warrant",
            "exclusionary rule",
        ],
    },

    "person_arrested_without_warrant": {
        "required_groups": [
            [
                "arrested without a warrant",
                "warrantless arrest",
                "illegal arrest",
                "hinuli nang walang warrant",
            ],
        ],
        "concepts": [
            "warrantless arrest",
            "illegal arrest",
            "in flagrante delicto",
            "hot pursuit",
        ],
    },

    # =====================================================
    # CONTRACTS
    # =====================================================

    "party_breached_contract": {
        "required_groups": [
            [
                "breach of contract",
                "did not follow the contract",
                "did not honor the agreement",
                "violated the agreement",
                "hindi sinunod ang kontrata",
                "hindi tinupad ang kontrata",
            ],
        ],
        "concepts": [
            "breach of contract",
            "contractual obligations",
            "damages",
        ],
    },

    # =====================================================
    # NEGLIGENCE
    # =====================================================

    "person_injured_due_to_negligence": {
        "required_groups": [
            [
                "negligence",
                "was negligent",
                "caused injury through negligence",
                "dahil sa kapabayaan",
                "napinsala dahil sa kapabayaan",
            ],
        ],
        "concepts": [
            "negligence",
            "quasi-delict",
            "civil liability",
            "damages",
        ],
    },

    # =====================================================
    # SUCCESSION
    # =====================================================

    "siblings_dispute_inheritance": {
        "required_groups": [
            [
                "inheritance dispute",
                "fight over inheritance",
                "mana dispute",
                "problema sa mana",
                "pinag-aawayan ang mana",
            ],
        ],
        "concepts": [
            "succession",
            "inheritance",
            "estate",
            "heirs",
            "legitime",
        ],
    },

    # =====================================================
    # CYBERCRIME
    # =====================================================

    "person_account_hacked": {
        "required_groups": [
            [
                "hacked my account",
                "someone hacked my account",
                "unauthorized access",
                "na hack ang account ko",
                "na-hack ang account ko",
            ],
        ],
        "concepts": [
            "unauthorized access",
            "cybercrime",
            "computer-related offense",
        ],
    },

    "person_defamed_online": {
        "required_groups": [
            [
                "defamed me online",
                "posted lies about me",
                "spread false accusations",
                "siniraan ako online",
                "pinagbintangan ako online",
            ],
        ],
        "concepts": [
            "online libel",
            "defamation",
            "cybercrime",
        ],
    },

    # =====================================================
    # VEHICULAR
    # =====================================================

    "person_involved_in_vehicle_accident": {
        "required_groups": [
            [
                "car accident",
                "vehicle accident",
                "vehicular accident",
                "bumangga sa kotse ko",
                "bumangga sa akin",
                "nabundol ako",
            ],
        ],
        "concepts": [
            "vehicular accident",
            "negligence",
            "quasi-delict",
            "civil liability",
            "damages",
        ],
    },
}


# =========================================================
# QUERY UNDERSTANDING PIPELINE
# =========================================================

class QueryUnderstandingPipeline:
    """
    Normalizes a legal query and performs controlled
    domain, issue, scenario, and concept expansion.

    The pipeline supports:
    - English legal terminology
    - Common English expressions
    - Filipino phrases
    - Taglish expressions
    - Present/past/future wording
    - Legal domains
    - Legal issues
    - Factual scenarios
    - Semantic concept expansion
    """

    @classmethod
    def understand(
        cls,
        query: str,
    ) -> dict[str, Any]:

        original_query = cls._normalize_whitespace(
            query
        )

        if not original_query:
            raise ValueError(
                "Search query cannot be empty."
            )

        normalized_query = cls.normalize_text(
            original_query
        )

        domain_result = cls._match_definitions(
            normalized_query,
            LEGAL_DOMAINS,
            result_key="intent",
        )

        issue_result = cls._match_definitions(
            normalized_query,
            LEGAL_ISSUES,
            result_key="issue",
        )

        scenario_result = cls._match_scenarios(
            normalized_query
        )

        matched_concepts = cls._merge_unique(
            domain_result["concepts"],
            issue_result["concepts"],
            scenario_result["concepts"],
        )

        expansion_parts = cls._merge_unique(
            [original_query],
            [normalized_query],
            matched_concepts,
        )

        return {
            "original_query": original_query,

            "normalized_query": normalized_query,

            "expanded_query": " ".join(
                expansion_parts
            ),

            "primary_intent": (
                domain_result["labels"][0]
                if domain_result["labels"]
                else None
            ),

            "matched_intents": (
                domain_result["labels"]
            ),

            "primary_issue": (
                issue_result["labels"][0]
                if issue_result["labels"]
                else None
            ),

            "matched_issues": (
                issue_result["labels"]
            ),

            "matched_scenarios": (
                scenario_result["labels"]
            ),

            "matched_concepts": matched_concepts,
        }

    # =====================================================
    # NORMALIZATION
    # =====================================================

    @classmethod
    def normalize_text(
        cls,
        query: str,
    ) -> str:

        value = unicodedata.normalize(
            "NFKC",
            str(query or ""),
        ).lower()

        value = value.replace(
            "’",
            "'",
        )

        value = re.sub(
            r"[^\w\s.'-]",
            " ",
            value,
        )

        value = cls._normalize_whitespace(
            value
        )

        # Longer phrases must be replaced first.
        ordered_phrases = sorted(
            COMMON_PHRASES.items(),
            key=lambda item: len(item[0]),
            reverse=True,
        )

        for source, replacement in ordered_phrases:

            value = re.sub(
                cls._phrase_pattern(source),
                replacement,
                value,
                flags=re.IGNORECASE,
            )

        return cls._normalize_whitespace(
            value
        )

    # =====================================================
    # DEFINITION MATCHING
    # =====================================================

    @classmethod
    def _match_definitions(
        cls,
        query: str,
        definitions: dict[
            str,
            dict[str, list[str]],
        ],
        result_key: str,
    ) -> dict[str, Any]:

        matches: list[dict[str, Any]] = []

        concepts: list[str] = []

        for label, data in definitions.items():

            matched_triggers = cls._find_phrases(
                query,
                data.get(
                    "triggers",
                    [],
                ),
            )

            if not matched_triggers:
                continue

            label_concepts = list(
                data.get(
                    "concepts",
                    [],
                )
            )

            matches.append(
                {
                    result_key: label,
                    "score": len(
                        matched_triggers
                    ),
                    "matched_triggers": (
                        matched_triggers
                    ),
                }
            )

            concepts.extend(
                label_concepts
            )

        matches.sort(
            key=lambda item: item["score"],
            reverse=True,
        )

        return {
            "labels": [
                match[result_key]
                for match in matches
            ],

            "concepts": cls._merge_unique(
                concepts
            ),

            "matches": matches,
        }

    # =====================================================
    # SCENARIO MATCHING
    # =====================================================

    @classmethod
    def _match_scenarios(
        cls,
        query: str,
    ) -> dict[str, Any]:

        matches: list[dict[str, Any]] = []

        concepts: list[str] = []

        for label, data in (
            LEGAL_SCENARIOS.items()
        ):

            group_matches: list[
                list[str]
            ] = []

            passed = True

            for group in data.get(
                "required_groups",
                [],
            ):

                matched_group = (
                    cls._find_phrases(
                        query,
                        group,
                    )
                )

                if not matched_group:
                    passed = False
                    break

                group_matches.append(
                    matched_group
                )

            if not passed:
                continue

            scenario_concepts = list(
                data.get(
                    "concepts",
                    [],
                )
            )

            matches.append(
                {
                    "scenario": label,

                    "score": sum(
                        len(group)
                        for group
                        in group_matches
                    ),

                    "matched_groups": (
                        group_matches
                    ),
                }
            )

            concepts.extend(
                scenario_concepts
            )

        matches.sort(
            key=lambda item: item["score"],
            reverse=True,
        )

        return {
            "labels": [
                match["scenario"]
                for match in matches
            ],

            "concepts": cls._merge_unique(
                concepts
            ),

            "matches": matches,
        }

    # =====================================================
    # PHRASE MATCHING
    # =====================================================

    @classmethod
    def _find_phrases(
        cls,
        query: str,
        phrases: list[str],
    ) -> list[str]:

        matched: list[str] = []

        for phrase in phrases:

            normalized = (
                cls._normalize_whitespace(
                    phrase
                )
                .lower()
            )

            if not normalized:
                continue

            if re.search(
                cls._phrase_pattern(
                    normalized
                ),
                query,
                flags=re.IGNORECASE,
            ):
                matched.append(
                    normalized
                )

        return cls._merge_unique(
            matched
        )

    # =====================================================
    # REGEX PHRASE PATTERN
    # =====================================================

    @staticmethod
    def _phrase_pattern(
        phrase: str,
    ) -> str:

        escaped = re.escape(
            phrase
        )

        return escaped.replace(
            r"\ ",
            r"\s+",
        )

    # =====================================================
    # WHITESPACE
    # =====================================================

    @staticmethod
    def _normalize_whitespace(
        value: Any,
    ) -> str:

        return " ".join(
            str(value or "")
            .strip()
            .split()
        )

    # =====================================================
    # UNIQUE MERGE
    # =====================================================

    @classmethod
    def _merge_unique(
        cls,
        *collections: list[str],
    ) -> list[str]:

        result: list[str] = []

        seen: set[str] = set()

        for collection in collections:

            for item in collection:

                normalized = (
                    cls._normalize_whitespace(
                        item
                    )
                )

                if not normalized:
                    continue

                key = normalized.lower()

                if key in seen:
                    continue

                seen.add(key)

                result.append(
                    normalized
                )

        return result