-- 유니크 칼럼 영어 버전 (Supabase 대시보드 → SQL Editor에서 실행)
-- 영어 메뉴(English)의 Unique Column에 영어 제목과 요약이 표시됩니다. 영어 화면에서는 블로그 링크 없이 요약만 보입니다.
-- 1) 영어 칸 추가

alter table public.columns add column if not exists title_en text;
alter table public.columns add column if not exists summary_en text;
alter table public.columns add column if not exists key_points_en text;
alter table public.columns add column if not exists checkpoint_en text;

-- 2) 영어 제목·요약 (현재 공개된 한국어 요약 70개 기준)

update public.columns set
title_en = $$Unentitled Applicant Already Holds the Patent? Grounds for Invalidation$$,
summary_en = $$This is Part 3 of our series on applications filed by unentitled persons. It covers the options available to the rightful owner when someone who is neither the inventor nor a successor in title has already obtained a patent.

The rightful owner may request an invalidation trial under Article 133 of the Korean Patent Act, but must first prove that it is the party entitled to the patent. If the patent is valuable to the business, the owner can instead seek a transfer of the patent under Article 99-2; once the transfer is registered, the owner is treated as having held the patent from its original registration date.

If an invalidation decision becomes final, the rightful owner who files within 30 days can claim the unentitled applicant's filing date (Article 35). If the patent has not yet been registered, protection under Article 34 may be available.$$,
key_points_en = $$To request an invalidation trial, you must first prove you are the rightful owner.
For a valuable patent, a transfer claim may be better than invalidation.
Filing within 30 days of a final invalidation decision preserves the original filing date.
Before registration, consider Article 34; after invalidation, consider Article 35.$$,
checkpoint_en = $$Start by gathering evidence of succession, such as employee invention rules, assignment agreements and invention disclosure forms.$$
where url = 'https://blog.naver.com/unicpat/224414721889';

update public.columns set
title_en = $$Can You Copy an Old Product That Has No Patent or Design Right?$$,
summary_en = $$This column addresses whether you may make and sell a product with the same shape as one sold for nearly ten years without any patent or design right, as long as you use a different company name and packaging.

Korean courts hold that a product shape not protected by a patent or design right may, in principle, be imitated. The Unfair Competition Prevention Act, however, provides two exceptions. Article 2(1)(i) prohibits direct imitation of a product's shape, but only for three years from the date the shape was completed.

Article 2(1)(a) may apply when long, exclusive use and advertising have turned the shape itself into a widely recognized indication of a particular company's product. An ordinary functional shape is unlikely to qualify, but changing only the packaging does not necessarily resolve every risk.$$,
key_points_en = $$Product shapes without registered rights may, in principle, be imitated.
The ban on shape imitation applies only for three years after the shape is completed.
A shape that has become a well-known source indicator may still be protected.
Common functional shapes are rarely recognized as source indicators.$$,
checkpoint_en = $$Check when the product shape was completed, how distinctive and well known it is, and whether consumers could be confused.$$
where url = 'https://blog.naver.com/unicpat/224400495922';

update public.columns set
title_en = $$Unentitled Applications Part 2: How "Identity of Invention" Is Judged$$,
summary_en = $$Part 2 of our series explains how similar the rightful owner's invention and the disputed patent must be for the patent to be treated as filed by an unentitled person.

In Supreme Court Decision 2009Hu2463, the court held that a patent can still be an unentitled application even if some elements were changed, as long as the changes were routine additions, deletions or modifications by a person skilled in the art and produced no special difference in effect. By contrast, if a newly added element solves an unsolved problem or produces a new effect, the patent may be treated as a separate invention.

In practice, the independent claims are broken down element by element and compared against research notes, design drawings and source code. The party alleging invalidity bears the burden of proof, so objective records are essential.$$,
key_points_en = $$An application can be unentitled even if the claim wording is not identical.
Routine design changes rarely make a separate invention.
Adding a key element with a new effect can change the outcome.
The party alleging an unentitled application bears the burden of proof.$$,
checkpoint_en = $$Break the registered claims into elements and compare each one against your company's R&D records.$$
where url = 'https://blog.naver.com/unicpat/224391991199';

update public.columns set
title_en = $$A Former Employee Filed a Patent on the Company's Invention? Who Is the Rightful Owner (Part 1)$$,
summary_en = $$Part 1 of our series looks at who owns the right to a patent when a former employee or even the company's CEO files an application in their own name for an invention developed at the company.

Only the actual inventor, or someone who has lawfully acquired the right from the inventor, may obtain a patent. If the company has employee invention rules or an agreement under which the right was transferred, the company is the rightful owner. If not, the joint inventors share the right and, in principle, must file together.

Being the CEO or the head of research does not by itself make someone an inventor. Leaving the company does not make a former employee an unentitled applicant either; what matters is who held the right before the employee left. Even without a written transfer, an implied transfer may be recognized depending on the circumstances.$$,
key_points_en = $$Only the inventor or a lawful successor may obtain a patent.
With employee invention rules in place, the company can be the rightful owner.
A CEO or major shareholder is not an inventor by position alone.
One joint inventor generally cannot file alone.$$,
checkpoint_en = $$Check whether you have employee invention rules, invention disclosure forms and records of compensation payments.$$
where url = 'https://blog.naver.com/unicpat/224385883077';

update public.columns set
title_en = $$Received a Trademark Warning Letter? No "Use as a Trademark," No Infringement$$,
summary_en = $$Based on a real consultation (with some details changed), this column explains what a cosmetics business should review first after receiving a trademark infringement warning letter.

Warning letters often demand that you stop using the mark, destroy your stock, sign an admission of infringement and pay damages. Receiving one, however, does not mean infringement is established. For infringement, the mark must be used as a trademark, that is, to indicate the source of the goods.

In this case, the client's own brand was printed prominently on the front of the container, while the disputed phrase appeared in small type alongside words describing ingredients and function. We therefore advised revising the wording without signing any admission, and replying with a letter explaining how the phrase had been used.$$,
key_points_en = $$A warning letter does not by itself establish trademark infringement.
Words used descriptively rather than as a source indicator may not infringe.
Placement, size and the presence of your own brand are considered together.
Signing an admission right away makes later defense difficult.$$,
checkpoint_en = $$Gather product photos, sales pages, sales period and volume, and the original warning letter before consulting a patent attorney.$$
where url = 'https://blog.naver.com/unicpat/224324800765';

update public.columns set
title_en = $$Patent Granted Quickly? Consider a Divisional Application Before Registration$$,
summary_en = $$Using two examples, this column explains why you should consider a divisional application before paying the registration fee when your patent has been allowed quickly.

A divisional application splits off different claims, within the scope of the original disclosure, into a separate application that keeps the original filing date. It can be filed within three months of receiving the decision to grant (before registration), allowing you to keep fighting for rejected claims or to secure several patents from one application.

If you plan to file improvements later, your own published patent could be cited against them. In that case, consider filing a divisional or a duplicate backup application and then, within one year, filing the improvement with a priority claim based on it.$$,
key_points_en = $$A divisional application keeps the original filing date.
It can be filed within three months of allowance, before registration.
Broad claims that were rejected can be pursued separately.
If improvements are planned, consider a backup filing and a priority claim before registration.$$,
checkpoint_en = $$When you receive a decision to grant, check whether you plan to file improvements within a year before paying the registration fee.$$
where url = 'https://blog.naver.com/unicpat/224276135479';

update public.columns set
title_en = $$Importing a Foreign Brand? Trademark Invalidation as a Risk Strategy$$,
summary_en = $$This column explains what to do when you import products under a proper contract with a foreign company, only to receive a cease-and-desist letter from a third party that registered the same mark in Korea first.

Being an authorized importer does not by itself protect you from claims under a Korean registered trademark. However, Article 34(1)(xiii) of the Korean Trademark Act bars registration of a mark that copies a mark recognized by consumers in Korea or abroad as indicating a specific source, when filed with a wrongful purpose. An invalidation trial can be brought on this ground.

Courts assess how well known the foreign mark is by its period of use, advertising and scope of use. Wrongful purpose is judged as of the filing date, considering the relationship and negotiations between the parties and whether the registrant actually prepared to do business under the mark.$$,
key_points_en = $$Even authorized imports can conflict with a Korean registered trademark.
A registration that preempts a known foreign mark in bad faith can be invalidated.
Recognition of the foreign mark is proven with sales, period of use and advertising.
Wrongful purpose is judged as of the registrant's filing date.$$,
checkpoint_en = $$Collect the foreign brand's period of use, sales and advertising records, and the history of any dealings with the Korean registrant.$$
where url = 'https://blog.naver.com/unicpat/224252831648';

update public.columns set
title_en = $$The Hidden Advantage of Filing a Utility Model and a Design Together$$,
summary_en = $$For simple products, a utility model alone may seem enough. Using a real case, this column shows how filing a utility model and a design together provides longer and broader protection.

A utility model protects structural or device-based inventions for 10 years, while a design right protects the product's appearance for 15 years. When a product's structural features are closely tied to its outer shape, registering that shape as a design complements the utility model.

In one case, a third party began selling an identical product after the client's utility model expired at the 10-year mark, but the design right filed at the same time was still in force and was used to stop the sales.$$,
key_points_en = $$A utility model protects structure and a design protects appearance, making design-arounds harder.
Utility models last 10 years and designs 15, adding up to 5 more years of protection.
The more a product's structure shows in its shape, the more a parallel design filing helps.
You can also file as a patent and convert to a utility model after examination.$$,
checkpoint_en = $$If your product's structural features are visible in its shape, consider a design filing alongside the utility model.$$
where url = 'https://blog.naver.com/unicpat/224235773744';

update public.columns set
title_en = $$Claim Scope Matters More Than Registration$$,
summary_en = $$A competitor's product may look like it infringes your patent, yet an infringement claim is often difficult. This column explains why, and how to protect claim scope during examination.

Under the all-elements rule, infringement requires the accused product to include every element of a registered claim. The comparison is made against the registered claims, not the claims as filed or published. If claims are narrowed heavily in response to office actions, the patent may be granted but fail to stop a competitor's design-around.

Korea offers limited chances to amend, so applicants often narrow claims significantly to obtain quick registration. It is important to decide early whether fast registration or broad protection is the priority.$$,
key_points_en = $$If even one element is missing, there is no infringement.
Infringement is judged against the registered claims, not the published application.
Over-narrowing claims in office action responses can weaken enforcement.
You must choose between speed of registration and breadth of protection.$$,
checkpoint_en = $$When you receive an office action, check not only whether the patent can be granted but whether the amended claims would still block competing products.$$
where url = 'https://blog.naver.com/unicpat/224235771123';

update public.columns set
title_en = $$Introducing ipbot1.com: Check Your Patent Fees and Filing Status in Real Time$$,
summary_en = $$This column introduces ipbot1.com, a patent lookup service developed by Unic Patent Firm. With just a business registration number or patent customer number, you can check your registered patents, pending applications and annuity fees in one place.

For each registered patent, the service shows whether annuity fees have been paid, any unpaid amounts, the fee and due date, the late-payment period and the reinstatement period, based on the latest Korean IP Office data. The applications menu lists granted, rejected and pending applications, and lets you download the list and full patent documents (PDF).

Small businesses and startups with several patents often lose rights by missing an annuity deadline. The service helps you review your portfolio and fees regularly.$$,
key_points_en = $$Look up all your patents with a business registration or patent customer number.
Check payment status, amounts, due dates and late-payment and reinstatement periods.
Download application lists and full patent documents.
The service also works on smartphones.$$,
checkpoint_en = $$Check your patents' annuity due dates and payment status regularly so that no rights lapse.$$
where url = 'https://blog.naver.com/unicpat/224201104916';

update public.columns set
title_en = $$AI Patent Filing Guide: Generative AI vs. Machine Learning$$,
summary_en = $$Using a service that analyzes fine-dust levels, stress indicators and traffic accident data as an example, this column compares how patent applications differ for machine learning and generative AI approaches.

A machine learning approach takes quantitative data and predicts values such as accident risk, and the patent can be built around the relationships between variables. Writing exact coefficients or numeric ranges into the claims, however, can make the scope too narrow. A generative AI approach additionally trains on literature, policies and accident cases to generate explanations and prevention guidance that people can understand.

In either case, simply stating that "AI is used" is unlikely to establish an inventive step. The application must show concretely which input data are combined, how they are processed and what results are produced.$$,
key_points_en = $$Machine learning patents need clearly defined inputs and prediction targets.
Claim the structure combining the variables rather than specific coefficients or ranges.
Generative AI patents should describe the added training data and the structure of the output.
"Using AI" alone is not enough to obtain a patent.$$,
checkpoint_en = $$Before filing an AI service, write down the input data, processing structure and outputs in concrete terms.$$
where url = 'https://blog.naver.com/unicpat/224155544805';

update public.columns set
title_en = $$Mobile ID: Analyzing KOMSCO's DID and Blockchain Authentication Patent$$,
summary_en = $$Based on the claims of a mobile ID authentication patent application filed by Korea Minting and Security Printing Corporation (KOMSCO) (Publication No. 10-2022-0028870), this column analyzes how a mobile ID based on decentralized identifiers (DIDs) is designed.

Claim 1 is divided into a step of issuing identity verifiable credentials (VCs) and a step of authenticating by selecting only the VCs needed for a service and signing them with a private key. The issuing server verifies the user's actual identity and issues the VCs, while only verification data such as DIDs and public keys are registered on the blockchain.

Identity information such as names and resident registration numbers, and the VCs themselves, are stored only on the user's device, not on the blockchain. This separation of issuance and authentication can be applied in finance, unmanned services, AI services and any other field that requires identity verification.$$,
key_points_en = $$The claim is split into a VC issuance step and a VC-based authentication step.
The blockchain stores only verification data such as DIDs and public keys, not personal data.
Identity information and VCs are stored on the user's device.
The issuing server and the authentication step are separated.$$,
checkpoint_en = $$If you are building an identity service, compare it with prior patents by where each type of data is kept at the issuance, storage and verification stages.$$
where url = 'https://blog.naver.com/unicpat/224119456014';

update public.columns set
title_en = $$Mobile ID and Digital Identity Authentication Patents$$,
summary_en = $$As AI services spread, trusted digital identity has become essential. This column outlines the structure and features of Korea's government-backed mobile ID and the patents behind it.

Mobile resident registration cards and driver's licenses have the same legal effect as physical IDs under their respective laws. Identity checks, issuance by a central server, storage in the device's secure area and blockchain-based verification are kept separate, so the risk of a mass data leak from a central server hack is low. The system also uses selective disclosure, passing on only the result needed, such as confirmation that a user is an adult.

Small businesses and startups can apply the technology in many areas, including identity checks at unmanned stores, real-name and age verification for AI services, access control, and authentication APIs for fintech and healthcare.$$,
key_points_en = $$Mobile IDs have the same legal effect as physical IDs.
Issuance, storage and verification are separated, lowering the risk of mass leaks.
Selective disclosure provides only the information needed.
Applications include unmanned stores, access control and authentication APIs.$$,
checkpoint_en = $$If your service needs identity verification, review mobile ID integration and related patents together.$$
where url = 'https://blog.naver.com/unicpat/224110132692';

update public.columns set
title_en = $$Security Patent Strategy: Lessons from Nusantao IP v. Samsung Electronics$$,
summary_en = $$Prompted by the infringement suit that U.S. patent assertion entity Nusantao IP filed against Samsung Electronics' Knox Vault security platform, this column analyzes the asserted patent (US 11,095,613) and what it suggests for security patent strategy. The focus is on the patent itself rather than on whether infringement occurred.

Claim 1 places a separate security module between a device's sensors and its internal communication bus, so that raw sensor data is encrypted before it travels over the bus to the application processor (AP). The module consists of an interface adapter, a bus adapter, a module processor, module memory and an encryption accelerator.

When security is handled at the AP, raw data can be exposed if the AP is compromised; this design moves the starting point of encryption to the sensor side. As IoT and AI devices multiply, patents on this kind of edge-level security are likely to grow in value.$$,
key_points_en = $$The asserted patent places a security module between the sensors and the internal bus.
The key idea is encrypting raw sensor data before it reaches the AP.
It also covers one security module managing multiple sensors.
Securing patents on edge-level security is increasingly important for IoT and AI.$$,
checkpoint_en = $$If you develop hardware security technology, review prior patents based on the stage at which data is first encrypted.$$
where url = 'https://blog.naver.com/unicpat/224105604014';

update public.columns set
title_en = $$Overcoming Inventive Step Rejections with the Rule Against Hindsight$$,
summary_en = $$Once an invention is complete, it can easily look like something anyone could have thought of. This column explains the rule against hindsight, which can be used to respond when an examiner denies inventive step, with reference to case law.

Because examiners search for prior art after already knowing the invention's structure and effects, they may conclude that combining prior art A and B would have been easy. The Korean Supreme Court holds that inventive step must not be judged with hindsight, on the premise that the content of the specification is already known (e.g., 2006Hu138).

In an invalidation case (2018Hu11681), the Supreme Court also rejected a finding of obviousness where the prior art could be combined only by substantially changing its structure and there was no suggestion or motivation to combine. You can respond by showing that combining the references would require major structural changes or would undermine the original purpose and effect of the prior art.$$,
key_points_en = $$Inventive step must be judged without knowledge of the invention, at the level of art at filing.
Fitting prior art together after seeing the invention is hindsight.
If combining requires major structural changes, inventive step is hard to deny.
A combination that defeats the prior art's purpose or effect supports your argument.$$,
checkpoint_en = $$When you receive an inventive step rejection, first check what would have to change to combine the references and whether there was any motivation to do so.$$
where url = 'https://blog.naver.com/unicpat/224103247160';

update public.columns set
title_en = $$Getting a Patent with a Parameter Invention$$,
summary_en = $$Some inventions are hard to distinguish from prior art by structure or composition alone but perform far better when certain property values are met. This column explains how to patent them as parameter inventions and what to watch out for.

A parameter invention defines a material or process by characteristic values such as crystallinity, glass transition temperature or density, or by correlations between variables. Because prior art with the same combination of parameters is hard to find, such inventions tend to fare well on novelty and inventive step.

However, if the effect of the parameter-defined material can also be achieved with existing technology, inventive step may be denied. To meet the disclosure requirements, the specification must describe the measurement methods, conditions and technical meaning in detail so that a person skilled in the art can practice the invention without undue experimentation (e.g., 2013Hu525).$$,
key_points_en = $$Parameter inventions are defined by characteristic values or correlations between variables.
Prior art with the same parameter combination is hard to find, which helps registration.
If existing technology achieves the same effect, inventive step may be denied.
Missing measurement methods and conditions can violate the disclosure requirements.$$,
checkpoint_en = $$Before filing a parameter invention, prepare comparative test data showing the effect changes within the range, along with the measurement conditions.$$
where url = 'https://blog.naver.com/unicpat/224099254735';

update public.columns set
title_en = $$The Physical AI Era: Who Benefits in the Robotics Industry?$$,
summary_en = $$Interest in physical AI, robotic systems that make decisions and act in the real world, grew after NVIDIA's large GPU supply deal with Korea. This column looks at the opportunities open to small businesses and startups.

The physical AI ecosystem can be divided into robot hardware, AI control software and on-site deployment (fine-tuning and integration). Large-scale training is done in data centers, and trained models are adapted on site, which greatly lowers the barrier to automation for small manufacturers.

For startups, the opportunity lies less in building robots than in software that helps robots understand and adapt to real tasks. Examples include robot vision and task recognition, automatic path generation, industry-specific automation packages and Robot-as-a-Service (RaaS).$$,
key_points_en = $$Revenue is growing in the software layer that makes robots work on site, more than in hardware.
Adapting pre-trained models on site lowers automation costs for small businesses.
Robot vision, automatic path generation and industry-specific packages are key opportunities.
Understanding industrial processes is the core capability for deployment.$$,
checkpoint_en = $$If you develop robotics or automation software, consider patents focused on how it is deployed on site and how it processes data.$$
where url = 'https://blog.naver.com/unicpat/224068159222';

update public.columns set
title_en = $$NVIDIA's 260,000-GPU Supply: The Dawn of Korea's "AI Factory" Era$$,
summary_en = $$Based on NVIDIA's announcement that it will supply 260,000 Blackwell-generation GPUs to Korea, this column looks at their performance, planned uses and the opportunities they open for small businesses and startups.

The GPUs are to be allocated to government AI infrastructure, semiconductor process optimization, autonomous driving and robotics model training, and cloud-based AI services. Manufacturers are expected to raise yields through digital twins and defect prediction, and robotics should benefit from easier real-time perception and control.

As cloud rental and government vouchers make GPUs more accessible, small businesses will be able to build their own domain-specific AI models. Turning this into growth requires a data strategy, participation in government support programs, and securing AI technology and patents.$$,
key_points_en = $$The GPUs will be split among the government and semiconductor, automotive and cloud companies.
They are expected to drive process optimization in manufacturing and real-time robot control.
Cloud rental and vouchers improve GPU access for small businesses.
A data strategy, support programs and AI patents are all needed.$$,
checkpoint_en = $$If you plan AI development, line up government support such as GPU vouchers and plan how to protect the results with patents.$$
where url = 'https://blog.naver.com/unicpat/224063414872';

update public.columns set
title_en = $$How Security Technology Has Evolved Through AI and Encryption Patents$$,
summary_en = $$Following our analysis of the Lotte Card hacking incident, this column looks at how patents for defending against web application server vulnerabilities and attacks disguised as normal traffic have developed.

The relevant patents fall into four groups: web application security such as SQL injection blocking and virtual patching; anomaly detection that uses machine learning to spot disguised traffic; real-time authentication such as multi-factor authentication and session protection; and financial data protection through tokenization and encryption, so that leaked data cannot be restored to the original.

Recent patents commonly combine AI detection, web application firewalls and tokenization into a structure that defends the full cycle, from detection to authentication to data protection.$$,
key_points_en = $$Virtual patching can block attacks even when security patches are delayed.
AI-based detection finds attacks disguised as normal traffic.
Linking detection, authentication and automatic blocking in real time is increasingly important.
Tokenization and encryption minimize damage even if data leaks.$$,
checkpoint_en = $$If you develop a security solution, define which stage it improves (detection, authentication or data protection) and check prior patents for that stage.$$
where url = 'https://blog.naver.com/unicpat/224059003346';

update public.columns set
title_en = $$BC Card's Stablecoin Payment Patent: A Card Company Enters Crypto?$$,
summary_en = $$Based on news that BC Card became the first in its industry to file a patent on stablecoin payment processing, this column explains what stablecoins are, the core of the patent and related patent trends.

A stablecoin is a digital asset whose value is pegged to a fiat currency such as the U.S. dollar or Korean won, or to a real asset, to reduce price swings. Even for the same stablecoin, prices differ across exchanges, which can cause confusion over how much to deduct from a customer's wallet at payment.

The core of BC Card's patent is real-time settlement: it collects prices from multiple exchanges in real time and fixes the number of coins to deduct at the moment the payment is approved. Payment stabilization that reflects exchange-rate and price differences is still a relatively uncrowded field.$$,
key_points_en = $$Stablecoins are digital assets pegged to fiat currencies or other assets to stabilize their price.
Prices vary across exchanges, which can confuse the amount deducted at payment.
BC Card's patent fixes the deduction based on prices at the moment of approval.
Global payment companies are also securing patents on blockchain payments and real-time settlement.$$,
checkpoint_en = $$If you are building a digital asset payment service, look for differentiators in settlement timing and price handling and secure them with patents.$$
where url = 'https://blog.naver.com/unicpat/224029643845';

update public.columns set
title_en = $$The Lotte Card Hack: Financial Security Weaknesses, Countermeasures and Patent Trends (Part 1)$$,
summary_en = $$This column reviews the causes of the Lotte Card hacking incident, in which personal data of about 2.97 million customers was leaked, along with the countermeasures needed and related security patent trends.

The attackers entered through a vulnerability in an unpatched web application server (WAS) and then disguised their traffic as normal communication using proxies and tunneling, going undetected for more than a month. Delayed patching and the failure to detect disguised traffic were the core causes.

Countermeasures include strengthening WAS security with regular patching and web application firewalls, secure coding and security checks during development, and AI-based anomaly detection with real-time monitoring. Patent filings combining AI traffic analysis with web application firewalls are also increasing.$$,
key_points_en = $$Delayed security patching was the first cause of the breach.
Traffic disguised with proxies and tunneling is hard to catch with signature-based tools.
WAS security, code security and real-time monitoring must be strengthened together.
Patent filings combining AI traffic analysis and web firewalls are increasing.$$,
checkpoint_en = $$If your company has security technology, protect its detection methods and response procedures with patents to build trust in the technology.$$
where url = 'https://blog.naver.com/unicpat/224022563267';

update public.columns set
title_en = $$Preparing for 2026 R&D Projects: What KEIT's Demand Survey Suggests$$,
summary_en = $$Based on the 2026 industrial technology R&D demand survey conducted by the Korea Evaluation Institute of Industrial Technology (KEIT), this column outlines the direction of 2026 government projects and how small businesses can prepare.

The survey was conducted by field, including smart manufacturing, displays, batteries and smart electronics, eco-friendly chemical processes, materials and components, semiconductors, knowledge services, shipbuilding and marine, and future mobility. Project planning was to follow, with program announcements expected from late 2025 to early 2026.

Notably, the survey already classified submissions by their link to AI, whether applying AI, developing AI-based technology or using AI in the R&D process, so AI relevance is likely to be an important evaluation factor for 2026 projects.$$,
key_points_en = $$Demand surveys show the direction of next year's R&D projects in advance.
Batteries, smart manufacturing, materials, semiconductors and digital services are central.
Companies that link their development to AI are likely to have an advantage.
Participate in the survey, align keywords and prepare validation data early.$$,
checkpoint_en = $$If you are preparing for government projects, submit input to demand surveys and connect your technology to policy keywords such as AI and sustainability.$$
where url = 'https://blog.naver.com/unicpat/224018809586';

update public.columns set
title_en = $$Preparing for 2026 Startup Government Programs: Support Programs and Strategies in the AI Era$$,
summary_en = $$With AI-related R&D budgets expected to grow significantly in 2026, this column outlines the main government support programs for startups, what you need to prepare and a timeline.

Key programs include the Startup Growth Technology Development Program, TIPS, the Pre-Startup and Early-Stage Startup Packages, the Startup Leap Package, the Super-Gap Startup 1000+ program and the Youth Startup Academy. Most major announcements come out between January and March.

To be selected, you need a business plan backed by quantitative evidence, intellectual property such as prior art searches and patent filings, a capable founder and team, and prototypes and validation data. Starting the business plan draft at least three months ahead leaves time to refine it.$$,
key_points_en = $$Major startup support announcements are concentrated in January to March.
Write the business plan to the criteria of technology, business viability and feasibility.
Prior art searches and patent filings can earn extra points in evaluation.
Prototypes and customer validation data demonstrate technology readiness.$$,
checkpoint_en = $$At least three months before announcements, finalize your item, prior art search, patent filing and prototype.$$
where url = 'https://blog.naver.com/unicpat/224009764741';

update public.columns set
title_en = $$AI Made Easy: Chatbots vs. AI vs. Generative AI$$,
summary_en = $$This column clarifies the often-confused terms chatbot, artificial intelligence (AI) and generative AI, and explains what to focus on when protecting each with patents.

A chatbot is a conversational interface that answers questions automatically and can work with pre-written scenarios alone. AI covers technologies that imitate human intelligence, such as machine learning and deep learning, and focuses mainly on analysis, classification and prediction. Generative AI creates new content, such as text, images and audio, based on the data it has learned.

From a patent perspective, rights can be secured around the interface and conversation features for chatbots, back-end systems and algorithms for AI, and domain-specific language models and the structures that generate results for generative AI.$$,
key_points_en = $$A chatbot is a conversational interface and need not use AI.
AI focuses on data-driven inference such as analysis, judgment and prediction.
Generative AI is a branch of AI that creates new content.
Considering all three perspectives helps secure broader rights.$$,
checkpoint_en = $$When filing an AI service, design the claims by separating where the core lies: conversation features, analysis algorithms or generation structure.$$
where url = 'https://blog.naver.com/unicpat/224002577499';

update public.columns set
title_en = $$Why Are U.S. Patent Damages So Much Larger Than Korea's? The KAIST v. Samsung Case$$,
summary_en = $$Using the FinFET patent infringement suit that KAIST IP brought against Samsung Electronics in the United States, this column compares why patent damages in the U.S. are much larger than in Korea.

In that case, a U.S. jury found willful infringement and awarded about USD 400 million, and about USD 200 million remained even after the award was reduced. U.S. courts allow damages based on sales revenue or broad reasonable royalties, and the jury system and extensive discovery make it easier to obtain the infringer's sales and profit data.

Korea, by contrast, calculates damages mainly from operating profit, offers limited means of gathering evidence, and its courts tend to award damages conservatively. Because the same case can produce far larger damages in the U.S., it is worth considering U.S. patent filings as well.$$,
key_points_en = $$The U.S. often allows revenue-based damages and high royalty rates.
Jury trials and discovery work in the patent owner's favor.
Korea's profit-based calculation and limited evidence gathering keep damages lower.
Enhanced damages for willful infringement reach up to 3x in the U.S. and 5x in Korea.$$,
checkpoint_en = $$If you expect U.S. sales for a technology, plan U.S. filings while preparing your Korean application.$$
where url = 'https://blog.naver.com/unicpat/223976739273';

update public.columns set
title_en = $$How Are Infringement Damages Calculated in Korea? A Real Case and the Formula$$,
summary_en = $$This column explains how damages are calculated in Korean patent, trademark and design infringement suits, using Patent Court Decision 2023Na11276, in which damages rose sharply because the infringement was found to be willful.

Article 128 of the Korean Patent Act provides three methods: the patent owner's lost profits, the infringer's profits, and a reasonable royalty. In this case, the court applied the infringer's-profits method, multiplying sales of the infringing products (about KRW 50.1 billion) by the marginal profit rate and the patent's contribution rate (20%) to arrive at basic damages of about KRW 760 million.

The court found willfulness because the defendant could have known of the patent and kept selling after a warning, and doubled the damages for the period after the punitive damages provision took effect, awarding about KRW 850 million in total. The law allows up to five times the damages.$$,
key_points_en = $$Damages are calculated by lost profits, infringer's profits or a reasonable royalty.
The infringer's-profits method can multiply sales by the marginal profit rate and contribution rate.
Continuing to sell after a warning can be found to be willful infringement.
Willful infringement can be compensated up to 5x for losses after the provision took effect.$$,
checkpoint_en = $$If you are preparing an infringement suit, secure the other party's sales data, records of your warning letters and evidence of the patent's contribution.$$
where url = 'https://blog.naver.com/unicpat/223973950280';

update public.columns set
title_en = $$From July 22, 2025: Up to 5x Damages for Willful Trademark and Design Infringement$$,
summary_en = $$This column covers the amended Trademark Act and Design Protection Act effective July 22, 2025, which raised the cap on punitive damages for willful trademark and design infringement from three times to five times.

For patents, the 5x cap has applied to willful infringement since August 21, 2024, so courts can now award up to five times the proven damages for willful infringement of patents, trademarks and designs alike. Courts set the amount considering factors such as the infringer's dominant position, the degree of intent, the scale of harm and the duration of infringement.

A higher cap does not mean Korea is now more favorable to rights holders than the U.S., however, since large differences remain in how damages are calculated and how evidence can be obtained.$$,
key_points_en = $$The punitive damages cap for willful trademark and design infringement rose to 5x.
For trademarks and designs, 5x applies to infringement on or after July 22, 2025.
For patents and utility models, 5x applies to infringement on or after August 21, 2024.
Infringement before the amendments may still be subject to the 3x cap.$$,
checkpoint_en = $$To claim willful infringement, collect evidence that the other party knew of your rights, such as warning letters, text messages and emails.$$
where url = 'https://blog.naver.com/unicpat/223952183192';

update public.columns set
title_en = $$Patents on RAG-Based LLM Technology$$,
summary_en = $$This column explains RAG (retrieval-augmented generation)-based LLMs, a foundation of generative AI, and analyzes patent filing trends in Korea.

RAG improves the accuracy and reliability of answers by retrieving documents related to a user's question from an external database and feeding them to the language model together with the question. Its main components include a vector database, text embeddings, a retrieval module and a generation model.

Korean filings in this area are still at an early stage, with about 25 in 2023 and about 31 in 2024. Most of the top applicants are AI startups and small solution providers, and large companies have not yet filed in earnest. By field, education leads, followed by search, chatbots, advertising and healthcare.$$,
key_points_en = $$RAG retrieves external documents to improve the accuracy of LLM answers.
RAG-related patent filings in Korea are still at an early stage.
Most top applicants are AI startups and small businesses.
Education leads in filings, followed by search and chatbots.$$,
checkpoint_en = $$If you are developing a RAG-based service, consider filing early on retrieval and generation structures combined with industry-specific data.$$
where url = 'https://blog.naver.com/unicpat/223949571264';

update public.columns set
title_en = $$Responding to Patent Infringement: Pros and Cons of Two Practical Routes$$,
summary_en = $$This column compares, from a practical standpoint, the two routes a patent owner can take against a competitor copying its patented product.

The first is to go straight to civil court with a preliminary injunction and a main lawsuit. A preliminary injunction can be decided within months and stop the other party's business quickly, but urgency and the need for preservation are hard to prove, and if the main suit goes the other way, the patent owner may face liability for damages.

The second is to first request a scope confirmation trial at the Intellectual Property Trial and Appeal Board, obtaining a ruling that the competitor's product falls within the patent before going to civil court. The ruling is not enforceable on its own but carries strong weight in civil litigation. The first route suits clear infringement; the second suits cases where the claim scope is ambiguous or the technical issues are complex.$$,
key_points_en = $$A preliminary injunction is fast and powerful, but urgency is hard to prove.
A scope confirmation trial is not enforceable but strongly supports a civil suit.
The other party can counter with an invalidation trial on either route.
Choose civil action for clear infringement and a trial first when scope is unclear.$$,
checkpoint_en = $$Before taking action, choose a route based on how clear the infringement is, how likely your patent is to be invalidated and how fast you need to act.$$
where url = 'https://blog.naver.com/unicpat/223946298195';

update public.columns set
title_en = $$Civil and Criminal Remedies for Patent Infringement and How the Other Side Responds$$,
summary_en = $$This column summarizes the civil and criminal measures a patent owner can take against infringement, how the accused party can respond, and what to prepare before litigation.

The patent owner can seek an injunction (preliminary or permanent) and damages in civil court, file a criminal complaint with investigative authorities, or request a scope confirmation trial at the Intellectual Property Trial and Appeal Board. A criminal complaint aims at punishment, so monetary compensation must be pursued separately in a civil suit.

The accused party can argue that its product falls outside the claims or uses freely available prior art, and can request an invalidation trial claiming the patent lacks novelty or inventive step. Before litigating, therefore, you need evidence of infringement, an analysis of claim scope, an assessment of your patent's invalidity risk and evidence of damages.$$,
key_points_en = $$Civil actions seek injunctions and damages; criminal complaints seek punishment.
A scope confirmation ruling is strong evidence in later litigation.
The accused party may argue non-infringement and request an invalidation trial.
Infringement analysis, invalidity risk review and damages evidence decide the outcome.$$,
checkpoint_en = $$Before acting, secure the infringing product, sales evidence, a claim chart and records of your lost sales.$$
where url = 'https://blog.naver.com/unicpat/223943846373';

update public.columns set
title_en = $$Generative AI Meets the Food Industry: What Is the Patent Strategy?$$,
summary_en = $$This column looks at where generative AI is being used in the food industry and where it has the greatest impact, with examples of companies applying it.

In developing food compositions and sauces, generative AI can suggest new flavor combinations based on customer reviews or health data, and it is also highly useful for personalized meal plans, recipe generation and the design of alternative protein formulations. Processing, storage, production and equipment, by contrast, focus more on optimization than generation, so the impact there is more limited.

Notable examples include NotCo, which uses AI to create plant-based food recipes, Givaudan, which suggests flavor combinations, and services that recommend meals based on health data.$$,
key_points_en = $$Generative AI has a large impact on developing food compositions and sauces.
Personalized meal plans and recipe generation are also strong use cases.
It is well suited to designing new formulations such as alternative proteins.
Processing and production focus on optimization rather than generation.$$,
checkpoint_en = $$For AI-created food compositions or meal services, consider whether the data inputs, generation method and validation structure can also be patented.$$
where url = 'https://blog.naver.com/unicpat/223937287458';

update public.columns set
title_en = $$Received a Trademark Warning Letter? (Part 2) What to Do If Infringement Is Likely$$,
summary_en = $$This column explains how to limit losses without escalating the dispute when you receive a trademark warning letter and infringement is likely to be found.

If your mark is similar, used on the same or similar goods, and used as a source indicator, infringement is likely. In that case, the basic steps are to stop using the mark immediately, remove it from your website, packaging and signage, and rebrand by filing a new trademark.

If you need to keep using the existing mark, you can negotiate a written license with the trademark owner, or check whether the registration has grounds for invalidation and request an invalidation trial. Damages for past sales should be negotiated reasonably, based on the extent and duration of the infringement.$$,
key_points_en = $$Similar marks on similar goods used as a brand are likely to infringe.
If infringement is clear, stopping use immediately limits your losses.
To keep using the mark, consider a written license or an invalidation trial.
Negotiate damages for past use reasonably with professional help.$$,
checkpoint_en = $$Do not react emotionally to a warning letter; first check whether you infringe and whether the other mark can be invalidated, then reply in writing.$$
where url = 'https://blog.naver.com/unicpat/223921683953';

update public.columns set
title_en = $$AI Platform Patent Analysis: What Generative AI Patents Has Naver Filed?$$,
summary_en = $$This column analyzes Korean patent filings related to generative AI platforms for media, search and content, and looks at two generative AI patent applications filed by Naver.

Filings in this area took off after generative AI spread in 2023. Because applications are published 18 months after filing, most of those visible now are from startups and small businesses that requested accelerated examination; filings by large companies appear to be largely unpublished so far. By field, education leads, followed by search and marketing and advertising.

Naver's applications cover a conversational service that keeps track of context to generate tailored responses, and a generative AI search service that identifies the intent of a question and provides an answer summarizing relevant documents alongside conventional search results.$$,
key_points_en = $$Generative AI platform patent filings took off after 2023.
Most published filings so far are accelerated-examination filings by small businesses.
Education, search, and marketing and advertising lead in filings.
Naver has filed patents on a conversational service and generative AI search.$$,
checkpoint_en = $$If you are developing a generative AI platform, file on your service's unique structure before large companies' applications are published.$$
where url = 'https://blog.naver.com/unicpat/223910899081';

update public.columns set
title_en = $$Is That Deepfake Video Impersonating You? AI Security Patent Trends$$,
summary_en = $$With large-scale data breaches and deepfake crimes on the rise, this column analyzes the types of AI security technology and patent filing trends in Korea.

AI security divides into technology that uses AI for security, such as intrusion detection and face recognition, and technology that protects AI models themselves from attack. Key examples include deepfake detection that identifies manipulated video and audio, defenses against adversarial attacks that subtly alter inputs to fool AI, and anti-spoofing technology that blocks forged biometric data.

AI security patent filings in Korea have risen sharply since 2021, led not by large corporations but by specialized small and mid-sized security companies, universities and research institutes.$$,
key_points_en = $$AI security covers both security using AI and the security of AI itself.
Deepfake detection, adversarial attack defense and anti-spoofing are key technologies.
AI security patent filings in Korea have surged since 2021.
Specialized security firms and universities lead the filings.$$,
checkpoint_en = $$If your company has AI security technology, secure patents on its core detection and defense structures now, while large companies have filed few.$$
where url = 'https://blog.naver.com/unicpat/223901008880';

update public.columns set
title_en = $$Received a Trademark Warning Letter? Don't Panic$$,
summary_en = $$This column covers what to check calmly after receiving a trademark warning letter, and the situations in which your use may not be infringement.

First, confirm that the mark in the letter is actually registered and valid, and that the sender is the rightful owner. Infringement requires a same or similar mark, used on the same or similar goods as those designated, and used as a source indicator. Even when the mark is the same, the goods are often not similar.

Use of your own name or trade name without trademark purpose, descriptions of a product's ingredients or effects, resale of genuine imported goods, and use that began before the other party filed (prior use rights) may not be infringement. These exceptions may not apply, however, if there is a wrongful purpose or a risk of confusion.$$,
key_points_en = $$First check whether the other party's mark is registered and valid.
Infringement requires a similar mark, similar goods and use as a trademark.
In infringement cases, goods can be found similar even in different similarity groups.
Legitimate use of your trade name, descriptive use and prior use may not infringe.$$,
checkpoint_en = $$If your company name resembles the other mark, reduce the risk by showing it only in small type as the manufacturer, such as in the website footer or on the back of the product.$$
where url = 'https://blog.naver.com/unicpat/223901032612';

update public.columns set
title_en = $$Indirect Patent Infringement: Is Selling Only Cartridges or Pen Refills a Problem?$$,
summary_en = $$This column addresses whether making and selling only parts or consumables, such as pen refills, compatible cartridges or hair straightener covers, can infringe a patent on the finished product.

A standalone part that lacks some elements of a finished-product claim is, in principle, unlikely to infringe literally. However, Article 127 of the Korean Patent Act treats the commercial production or sale of items used exclusively to produce a patented product as infringement (indirect infringement), so a dedicated part can be a problem.

Courts have found a printer photoconductive drum cartridge to be subject to indirect infringement, while holding that film for laminating certificates was not a dedicated item merely because it was a consumable. The key questions are whether the part has an economically and commercially meaningful alternative use, and whether combining it reproduces the structure of the claim.$$,
key_points_en = $$A part lacking some elements of a finished-product claim is unlikely to infringe literally.
A part used exclusively to make the patented product can be indirect infringement.
An "alternative use" must be practical, not merely theoretical.
Replacement parts also raise issues of patent exhaustion and repair versus reconstruction.$$,
checkpoint_en = $$Before launch, review the claim elements, the structure created when combined, and any practical alternative uses of the part.$$
where url = 'https://blog.naver.com/unicpat/224442344574';

update public.columns set
title_en = $$Provisional Application Strategy: Securing Your Filing Date First$$,
summary_en = $$When an invention is not yet complete, or must be disclosed early for an investor meeting, you can secure a filing date first with a provisional application, filed with a description of the invention but no claims. This column explains the strategy.

Under Article 42-2 of the Korean Patent Act, an application can be filed without claims, and it may be submitted as an ordinary file such as Hangul (HWP), Word, PDF or PowerPoint. A provisional application cannot be examined on its own, however, and it is deemed withdrawn unless claims are added by amendment within 1 year and 2 months of the priority date.

Amendments are limited to what the provisional application already describes. To supplement or add content, you must file an application claiming priority from the provisional within one year. In that case, content in the provisional keeps its filing date, and newly added content receives the later filing date.$$,
key_points_en = $$A provisional application secures a filing date with a description but no claims.
It can be filed as an ordinary document such as PPT, PDF or HWP.
Without claims added within 1 year and 2 months, the application is deemed withdrawn.
To add content, file a priority-claiming application within one year.$$,
checkpoint_en = $$Before an investor meeting or public presentation, file a provisional with as much detail as you have now, and schedule the full application within a year.$$
where url = 'https://blog.naver.com/unicpat/224226227161';

update public.columns set
title_en = $$Incheon IP Center's 2026 Domestic and International IP Rights Support Program (Round 1)$$,
summary_en = $$This column introduced the Incheon Intellectual Property Center's 2026 Domestic and International IP Rights Support Program (Round 1). Applications ran from March 3 to 17, 2026 and are now closed; announcements for later rounds can be found through the Incheon IP Center and the Incheon business support website (BizOK).

The program covered, up to a set limit, the official fees and patent attorney fees (excluding VAT and the company's share) for patents, utility models, trademarks and designs filed on or after January 1, 2026 by small businesses located in Incheon. PCT applications were excluded, and companies that had not yet filed could use the IP emergency support program instead.

Applicants had to enter the application number and patent firm details accurately and submit their business registration certificate, SME confirmation certificate and filing receipt. Without the SME confirmation, the company's share could be charged at the medium-sized enterprise rate.$$,
key_points_en = $$The program supports domestic filing costs for small businesses in Incheon.
Applications filed earlier in the same year could be submitted retroactively.
It covers official and attorney fees, excluding VAT and the company's share.
Omitting the SME confirmation certificate can increase the company's share.$$,
checkpoint_en = $$If your company is in Incheon, check the early-year support program schedule and keep your filing receipts and SME confirmation certificate ready.$$
where url = 'https://blog.naver.com/unicpat/224212078457';

update public.columns set
title_en = $$Overview of Korea's 2026 Startup Support Programs$$,
summary_en = $$Based on the Integrated Announcement of 2026 Startup Support Programs released on December 19, 2025, this column outlines the overall budget, the main programs, and which programs to look at for each stage of a startup.

The 2026 programs total about KRW 3.274 trillion across 88 central government programs, about KRW 141.7 billion across 209 metropolitan government programs, and about KRW 48.8 billion across 211 local government programs. For early- and mid-stage startups, commercialization support and R&D are the core, and manufacturing startups should also look at facility, space and productization support.

By stage, representative programs are the Pre-Startup Package for aspiring founders, the Early-Stage Startup Package for companies up to three years old, and the Startup Leap Package for those three to seven years old. Deep-tech companies can consider the Super-Gap Startup Project, investment-linked startups the public-private co-founder program, founders aged 39 or under the Youth Startup Academy, and manufacturing startups the all-in-one productization package.$$,
key_points_en = $$More than 500 startup support programs are offered across central and local governments in 2026.
Eligible programs depend on company age: pre-startup, early (up to 3 years) or leap (3-7 years).
There are specialized programs for deep tech, investment-linked startups, youth and restarts.
Manufacturing startups should also look at support from prototype to initial production.$$,
checkpoint_en = $$First choose programs that match your company's age and field, then prepare your business plan and patent filings in line with the announcement schedule.$$
where url = 'https://blog.naver.com/unicpat/224136173878';

update public.columns set
title_en = $$Preparing for Incheon's 2026 Domestic IP Rights Support Program$$,
summary_en = $$This column introduced the Incheon Intellectual Property Center's domestic IP rights support program based on its 2025 announcement, and explained how to prepare to receive support for 2026 filings. The actual 2026 Round 1 announcement is covered in a separate column.

The program covers part of the filing costs for patents, utility models, trademarks and designs filed with the Korean IP Office by small businesses located in Incheon. Only applications already filed and assigned an application number are eligible, not planned filings. In 2025, it provided up to KRW 1.3 million per application, excluding VAT and the company's own share.

Selection is based on evaluation scores, and the budget often runs out by April or May, so it is best to complete filings early in the year (by March at the latest) and apply. Because availability varies by region, check with your local IP center.$$,
key_points_en = $$Only applications that have already been filed are eligible.
In 2025, support was up to KRW 1.3 million per application.
The budget often runs out in spring, so applying early in the year is better.
Programs and budgets vary by region.$$,
checkpoint_en = $$To receive support, complete your filing early in the year and apply as soon as you receive the filing receipt.$$
where url = 'https://blog.naver.com/unicpat/224131361332';

update public.columns set
title_en = $$Patent Application vs. Registration: How a Patent Is Granted$$,
summary_en = $$Answering the common question "Do I have a patent once I file?", this column explains the difference between filing and registration, requests for examination and accelerated examination, and the basics of foreign filing and the PCT.

A patent application is the submission of a specification to the Korean IP Office; it is given an application number that proves who filed first. Patent rights arise only after an examiner reviews novelty, inventive step and other requirements, decides to grant, and the registration fee is paid. Filing alone does not allow you to seek an injunction or damages.

Examination begins only after a request for examination, and the application is deemed withdrawn if no request is made within three years of filing. Accelerated examination can produce results within a few months. The U.S. requires no separate request for examination, but Europe, China and Japan do, and the PCT only buys time to file in multiple countries; registration must be obtained in each country separately.$$,
key_points_en = $$Patent rights arise upon registration, not filing.
Examination does not begin without a request for examination.
Accelerated examination is faster but costs more and publishes the invention early.
A PCT application alone does not lead to registration; each national phase must be examined.$$,
checkpoint_en = $$After filing, review the deadline for requesting examination, whether accelerated examination is needed, and your foreign filing plans.$$
where url = 'https://blog.naver.com/unicpat/224113821659';

update public.columns set
title_en = $$Better Performance but a Similar-Looking Product: How to Get a Patent$$,
summary_en = $$This column explains how to improve your chances of a patent when your product clearly performs better but looks almost the same as existing products.

First, define what has improved over existing products in terms that fit your field: precision and repeatability for measuring instruments, ease of use and simpler structure for machinery, or taste and functionality for food. Next, you must be able to explain the specific reason for the improvement through differences in structure or process.

Objective evidence such as test data, drawing comparisons and test reports makes the case much more persuasive. Courts assess inventive step by considering the difficulty of the combined configuration as a whole together with its distinctive effects, so even a small structural difference can be patentable if it produces a clear effect.$$,
key_points_en = $$Start by defining the performance gains over existing products for your field.
Explain the improvement through differences in structure or process.
Objective evidence such as test data improves the chance of registration.
Even a small structural difference can show inventive step if it has a distinctive effect.$$,
checkpoint_en = $$Before filing, produce performance test data comparing your product with existing ones and show the structure behind the difference in drawings.$$
where url = 'https://blog.naver.com/unicpat/224091326344';

update public.columns set
title_en = $$Overcoming an Inventive Step Rejection: Difficulty of Combination$$,
summary_en = $$This column explains how to respond, based on the difficulty of combination, when the prior art shows only A of your invention A+B, yet the examiner denies inventive step on the ground that a person skilled in field A could easily think of B and combine them.

Courts do not assess inventive step element by element; they consider the difficulty of the organically combined configuration as a whole together with its distinctive effects (e.g., 97Hu1610). Inventive step is denied where the prior art suggests or motivates the combination, or where the combination would have been easy in light of the state of the art and industry needs.

You should therefore examine whether A and B are normally used together, whether the prior art shares the purpose and problem of your invention, and whether it is normal for a person skilled in field A to work in field B. If the purposes differ or the fields are far apart, you can argue there was no motivation to combine.$$,
key_points_en = $$Inventive step is judged on the combined configuration as a whole, not on individual elements.
The key is whether the prior art suggests or motivates the combination.
If the prior art has a different purpose, you can argue there was no motivation to combine.
The farther apart the technical fields, the easier it is to show difficulty of combination.$$,
checkpoint_en = $$When you receive an inventive step rejection, compare the prior art's purpose and technical field with your invention to show there was no motivation to combine.$$
where url = 'https://blog.naver.com/unicpat/224087267029';

update public.columns set
title_en = $$Inventive Step Made Easy: Functional Compositions, Chemistry and Pharmaceuticals$$,
summary_en = $$This column explains how inventive step is judged differently across technical fields, focusing on functional material inventions such as antiviral compositions.

In mechanical, electronic and IT fields, results are relatively predictable, so combining known technologies to produce only expected effects rarely shows inventive step. In chemistry, biotechnology and pharmaceuticals, interactions between ingredients are hard to predict, so an unexpected effect itself can be the key basis for inventive step.

For example, an ingredient with antibacterial effects does not necessarily have antiviral effects, and studies show the same substance can work very differently depending on the type of virus. A functional composition patent therefore needs more than a combination of ingredients; its effect must be proven objectively with experimental data.$$,
key_points_en = $$Inventive step is judged on the combined configuration and its distinctive effects.
In mechanical and IT fields, an unexpected configuration matters.
In chemistry and pharmaceuticals, an unexpected effect matters.
An antibacterial effect does not imply an antiviral effect.$$,
checkpoint_en = $$If you are filing a functional composition, prepare experimental data showing its effect on each target virus or microbe and any synergistic effect.$$
where url = 'https://blog.naver.com/unicpat/224073182703';

update public.columns set
title_en = $$Can You Claim a Grace Period Abroad? Comparing the U.S., Japan, Europe and China$$,
summary_en = $$When an invention has already been disclosed through a product launch, paper or trade show, Korea allows you to file within one year. This column compares grace period rules by country to see whether you can still obtain patents abroad.

In Korea, disclosure by the inventor or rights holder in any form is excused if you file within one year. The U.S. places no limits on the form of disclosure and counts one year from the effective filing date (priority date), so you can file in the U.S. within a year based on a Korean application that claimed the grace period. Japan also allows 12 months, but counted from the disclosure date, so the Japanese application itself must be filed within that time.

China and Europe are much stricter. China allows only six months and recognizes only certain disclosures, such as at government-recognized exhibitions, government-hosted academic conferences, or disclosures made against the applicant's will; papers and ordinary product launches do not qualify. Europe likewise limits the grace period to six months for evident abuse or display at an officially recognized international exhibition.$$,
key_points_en = $$Korea allows filing within one year of disclosure, regardless of its form.
The U.S. counts one year from the priority date, so you can enter based on a Korean application.
Japan requires the Japanese application within 12 months of the disclosure date.
China and Europe recognize only limited disclosures within six months.$$,
checkpoint_en = $$If you may expand abroad, file before launching a product or publishing a paper; if you have already disclosed, check each country's remaining deadline first.$$
where url = 'https://blog.naver.com/unicpat/223937340037';

update public.columns set
title_en = $$Can a Tteokbokki Sauce Be Patented? Food Sauce Patent Cases and Tips$$,
summary_en = $$Using tteokbokki (spicy rice cake) sauce as an example, this column explains whether food compositions such as sauces can be patented and how to improve the chances of registration.

Sauces are hard to patent because many similar recipes and long-standing family recipes already exist. Even so, there are about 400 registered patents related to tteokbokki sauce. Examples include a sauce made with fermented lacquer-tree gochujang, a sauce made without gochujang by aging and fermenting vegetables at a set temperature and time, and a sauce that uses citrus peel to reduce a heavy aftertaste.

To improve your chances, make the difference from existing sauces clear. Showing health benefits, such as significantly reducing sugar or sodium or adding nutrients, or using ingredients not previously used, are effective approaches.$$,
key_points_en = $$Food compositions such as sauces can be patented.
There are about 400 registered patents on tteokbokki sauce alone.
You need ingredients, processes or effects that distinguish your sauce.
Health benefits such as lower sugar or sodium help with both registration and marketing.$$,
checkpoint_en = $$If you are filing a sauce recipe, document the mixing ratios, process conditions such as aging temperature and time, and ingredient data compared with existing products.$$
where url = 'https://blog.naver.com/unicpat/223933169736';

update public.columns set
title_en = $$Patent Registration Guide: Key Steps and Requirements from Filing to Grant$$,
summary_en = $$Starting from the question "Isn't my patent registered once I file?", this column explains the difference between filing and registration, the steps to registration and the three requirements for a patent.

After the specification is drafted and filed, the application goes through examination at the Korean IP Office (about 12 to 18 months for regular examination, about 3 months for accelerated examination). If grounds for rejection are issued, you respond with arguments and amendments, and patent rights arise only after the decision to grant and payment of the registration fee. Only then can you stop unauthorized use by others and claim damages.

The requirements are novelty, inventive step and adequate disclosure. If you disclosed the invention through social media or an exhibition before filing, you must claim the grace period within one year, and most rejections are for lack of inventive step. The specification must also explain the invention well enough for others to reproduce it, using experimental data, drawings, block diagrams or flowcharts as appropriate for the field.$$,
key_points_en = $$Patent rights arise after the decision to grant and payment of the registration fee.
Regular examination takes about 12-18 months; accelerated examination about 3 months.
The requirements are novelty, inventive step and adequate disclosure.
Most rejections are based on lack of inventive step.$$,
checkpoint_en = $$Do not disclose even a good idea before filing, and write a thorough specification with data and drawings suited to your field.$$
where url = 'https://blog.naver.com/unicpat/223928252212';

update public.columns set
title_en = $$Generative AI Patent Filing Guide: The Case of Fitness Training Content$$,
summary_en = $$Using an "AI trainer" that creates workout routines tailored to a user's physical condition and goals as an example, this column explains how to protect generative AI-based fitness content with patents.

For such a service to be granted, it must differ from existing content generation methods (novelty), show a technical improvement in the AI model's structure or processing (inventive step), and describe the model structure, data flow and relationship between inputs and outputs in concrete terms (disclosure). It helps to explain the training data, preprocessing such as pose extraction, model structure, system flowchart and UI examples.

In particular, presenting with diagrams a composite loss function that reflects both routine accuracy and predicted user response, and a structure that updates routines based on user feedback, helps establish inventive step.$$,
key_points_en = $$AI-generated personalized workout content can be patentable.
Describe the model structure, data flow and input-output relationships concretely.
A feedback-driven update structure supports inventive step.
Explaining distinctive training methods such as a composite loss function helps.$$,
checkpoint_en = $$If you are filing an AI content service, first draw a flowchart from user input through content generation to feedback.$$
where url = 'https://blog.naver.com/unicpat/223927015994';

update public.columns set
title_en = $$An Essential Requirement for a Patent: Understanding Inventive Step$$,
summary_en = $$This column explains what inventive step, a core requirement for a patent, means and how courts judge it, using a simple example.

Article 29(2) of the Korean Patent Act provides that an invention a person skilled in the art could easily make from the prior art cannot be patented. Courts do not assess elements one by one; they consider the difficulty of the organically combined configuration as a whole together with its distinctive effects (2005Hu3284), and also whether there is a synergistic effect beyond what the prior art would predict. Judging with hindsight after learning of the invention is not allowed (2006Hu138).

For example, an invention for checking home temperature and humidity on a smartphone may be rejected as an easy combination if an agricultural device that sends sensor data to a computer already exists. Inventive step may still be recognized, however, if the two technologies address different fields and problems, combining them involves technical difficulty, or the effect is new.$$,
key_points_en = $$Inventive step asks whether a person skilled in the art could easily make the invention.
The difficulty of the combined configuration and its distinctive effects are considered together.
A synergistic effect beyond expectations helps establish inventive step.
Judging with hindsight after learning of the invention is not allowed.$$,
checkpoint_en = $$Before filing, compare your invention with the closest prior art and state clearly in the specification why the combination is difficult and what new effect it has.$$
where url = 'https://blog.naver.com/unicpat/223924817228';

update public.columns set
title_en = $$Searching Patents the Right Way (Part 2): Mastering KIPRIS and Downloading Prior Art$$,
summary_en = $$Based on the redesigned interface introduced in early 2025, this column explains how to use the advanced search in KIPRIS, the Korean IP Office's free patent search service, and how to download prior patent documents as PDFs.

In the content search of the advanced search page, searching the abstract and claims together gives a better balance between accuracy and number of results than searching only the title. If you know the application, publication or registration number, use the number search; if you know the applicant or inventor, use the name search. Because names may be shared, entering both the inventor and applicant gives more accurate results.

Open a patent from the results and click "Open in new window" to see the details and full publication, then use the PDF icon to download the original document with drawings. Because results change with wording even when the meaning is the same, combine several keywords, and judge similarity by reading the abstract, drawings and claims yourself.$$,
key_points_en = $$Searching the abstract and claims together is recommended.
If you know a number, applicant or inventor, search that field directly.
You can download the full document with drawings as a PDF from the detail page.
Results differ with wording, such as "clothing recommendation" vs. "fashion recommendation."$$,
checkpoint_en = $$When you have an idea, search with several combinations of similar keywords and read the claims of the closest patents yourself.$$
where url = 'https://blog.naver.com/unicpat/223873929484';

update public.columns set
title_en = $$Searching Patents the Right Way (Part 1): Is My Idea Already Patented?$$,
summary_en = $$Many people say, "I searched and found nothing similar," but without the right search methods you can miss patents that exist. This column walks step by step through the basics of finding prior patents with KIPRIS, the Korean IP Office's search service.

Advanced search is more accurate than the main search box, and it is best to start by searching the abstract rather than the title. In KIPRIS, AND is entered as "*" and OR as "+". For an AI clothing recommendation system, for example, broaden the keywords by grouping similar terms, such as (AI+artificial intelligence)*(clothing+apparel+menswear+womenswear).

Open each result and read the abstract to see whether it resembles your idea. This lets you gauge in advance whether the same technology already exists, whether a design-around is possible and how likely registration is.$$,
key_points_en = $$Use advanced search instead of the main search box.
Start by searching the abstract.
Enter AND as "*" and OR as "+", grouping similar terms to broaden the search.
Open and compare each result yourself.$$,
checkpoint_en = $$Before filing or commercializing an idea, search several times with different similar expressions to check whether the same technology exists.$$
where url = 'https://blog.naver.com/unicpat/223873881651';

update public.columns set
title_en = $$Protecting Software with Patents and Copyright$$,
summary_en = $$Based on a consultation with a small IT company that developed a system using AI open-source software, this column explains how software can be protected by patents and by copyright.

Software consists of an algorithm, the logical procedure of a task, and source code, which implements it in a programming language. An algorithm that is a new and better processing method can be protected by a patent, and because using the same method can infringe even with different code, the scope of protection is broad. A patent must be filed and granted, however, and lasts 20 years from filing.

Source code is protected by copyright as a creative expression without registration, but the scope is narrow, covering only identical or similar code. Registering the copyright makes it stronger evidence in a dispute. We therefore recommended protecting the core algorithm with a patent and the source code with copyright registration.$$,
key_points_en = $$Algorithms are protected by patents and source code by copyright.
A patent can be infringed by the same method even with different code.
Copyright arises without registration, but registration helps as evidence in disputes.
Recommendation, route optimization and blockchain processing methods can be patentable.$$,
checkpoint_en = $$If you have developed software, map its core processing steps in a flowchart to assess patentability, and register the copyright in your source code.$$
where url = 'https://blog.naver.com/unicpat/223871417909';

update public.columns set
title_en = $$Super-Accelerated Examination for Patents and Trademarks: Registration in About Two Months$$,
summary_en = $$This column compares super-accelerated examination, which can secure patents and trademarks faster than accelerated examination, with regular and accelerated examination.

Regular examination takes about two years for patents and about 18 months for trademarks, while accelerated examination takes six months or more for patents and about three months for trademarks. Super-accelerated examination aims for about two months for both patents and trademarks, at the same cost as accelerated examination.

It is available for export-related applications among those eligible for accelerated examination, including applications for improvements to products with an export record, base applications in advanced technology fields used for Paris Convention priority, and base applications for Madrid international registrations. Obtaining a Korean patent quickly can also speed up foreign registration through the Patent Prosecution Highway (PPH).$$,
key_points_en = $$Super-accelerated examination aims for results in about two months for patents and trademarks.
It is available for export-related applications eligible for accelerated examination.
Improvements to products exported within the past three years also qualify.
A Korean registration can speed up foreign registration through the PPH.$$,
checkpoint_en = $$If your product is exported or will be, check at the filing stage whether it qualifies for super-accelerated examination.$$
where url = 'https://blog.naver.com/unicpat/224252833097';

update public.columns set
title_en = $$Partial Designs: Protecting the Key Element of Your Product$$,
summary_en = $$This column explains, with examples, the partial design system, which protects only part of a product's shape, such as a handle, a grille or a sole pattern, rather than the whole product.

If you register the design of an entire cup, a competitor that copies only your distinctive handle and changes the body may be found dissimilar because the overall impression differs. If you had registered the handle as a partial design from the start, you could claim infringement even against such a design-around.

Design similarity is judged by the overall aesthetic impression, but a partial design protects the eye-catching key element itself, which is an advantage in infringement cases. When filing, draw the part to be protected in solid lines and the rest in dotted lines; the article name can now also be stated as the part itself, such as "handle for cup."$$,
key_points_en = $$A partial design protects only part of a product's shape.
Registering only the whole design can make it hard to stop copies of the key part.
Show the protected part in solid lines and the rest in dotted lines.
A partial design must still relate to an independently tradable article.$$,
checkpoint_en = $$First identify the most original part of your product, then decide whether to file a full design, a partial design or both.$$
where url = 'https://blog.naver.com/unicpat/224242538008';

update public.columns set
title_en = $$What Happens If You Miss the Design Registration Fee? Publication, Late Payment, Lapse and Refiling$$,
summary_en = $$Under the Korean Design Protection Act, this column explains what happens if you cannot pay the registration fee after a design is allowed, including late payment, lapse and whether you can file the same design again.

Patents are published automatically 18 months after filing, but a design is published in the Design Gazette only upon registration unless the applicant requests early publication. Even after allowance, rights arise only when the registration fee is paid; after the deadline, you can still pay with a surcharge during a six-month late payment period and the reinstatement period that follows.

Once these periods pass, the design right does not arise. If the design was never published because it was not registered, you can file the same design again. If you requested publication or the design has become public, for example through a product launch, the new application may be rejected for lack of novelty.$$,
key_points_en = $$Without a publication request, a design is not published until registration.
There is a six-month late payment period after the registration fee deadline.
After the late payment and reinstatement periods, the design right does not arise.
If the design was never published, you can file it again.$$,
checkpoint_en = $$If you missed the registration fee, first check whether the late payment period remains; if considering refiling, check whether the product has been launched or disclosed.$$
where url = 'https://blog.naver.com/unicpat/224219963867';

update public.columns set
title_en = $$How to Register a Trademark: Finding Similar Prior Marks with Similarity Group Codes$$,
summary_en = $$This column explains the two checks for gauging whether a trademark can be registered before filing, focusing on how to find similar prior marks using similarity group codes, with examples.

First, check under Article 33 of the Korean Trademark Act whether the mark lacks distinctiveness, for example a generic name, an indication of origin, quality or efficacy, a well-known place name or common surname, or an overly simple mark. Next, find the similarity group codes for your designated goods and search KIPRIS for similar marks already registered in those groups.

For example, filing "Dallida" for coffee, game software and online shopping mall services may yield different results by similarity group, so only some goods may be registrable. In examination, similarity groups are effectively decisive, but in litigation and trials the nature, use and sales channels of the goods are considered together, so goods in different groups may still be found similar.$$,
key_points_en = $$Generic names, quality or origin indications and well-known place names are hard to register.
Examiners search prior marks by the similarity group codes of the designated goods.
The same mark may be registrable for some groups but not others.
Courts look at actual trade circumstances rather than similarity groups alone.$$,
checkpoint_en = $$Before filing, search by the similarity group code of each designated item, including variations in Korean and English spelling, spacing and suffixes.$$
where url = 'https://blog.naver.com/unicpat/224096387987';

update public.columns set
title_en = $$Fast-Track Examination: Korea's Super-Accelerated Examination for Patents and Trademarks$$,
summary_en = $$This column explains the super-accelerated examination system introduced on October 15, 2025, including who can apply and how to use it. It examines export-related patents, utility models and trademarks much faster than existing accelerated examination.

With super-accelerated examination, patents and utility models receive a first examination result within one month and a final result in about two months. Trademarks receive a first result within 30 days and a final result in about 60 days, including the opposition period. That is 80 to 90 percent faster than regular examination.

Eligible applications include patents and utility models that qualify for export-promotion accelerated examination or are base applications in advanced technology fields used for Paris Convention priority, and trademarks that are in or planned for export use or serve as base applications for priority or Madrid filings. Improvements to products exported within the past three years and companies selected for government overseas support programs also qualify.$$,
key_points_en = $$Patents can receive a first examination result within one month.
Trademarks receive a final result in about 60 days, including the opposition period.
Export-related applications qualify, and there is no limit on the number of trademarks.
Improvements to exported products also qualify.$$,
checkpoint_en = $$If you must set an overseas filing strategy within the priority period, check the super-accelerated examination requirements when filing in Korea.$$
where url = 'https://blog.naver.com/unicpat/224094394835';

update public.columns set
title_en = $$Filing a Business Emblem: Can a Nonprofit Group Be the Applicant?$$,
summary_en = $$Based on a case in which a nonprofit civic group wanted to file a business emblem (a mark for non-commercial activities) in the group's own name, this column explains what a business emblem is, who may apply and what unincorporated groups can do.

A business emblem is a mark used by a person carrying out non-profit activities to indicate those activities. It protects the credible names of welfare, education and volunteer organizations and prevents unauthorized use by others. Under the examination guidelines, however, the applicant must be a legal entity or an individual; an unincorporated group holding only a nonprofit registration certificate or a tax identification number cannot apply and will face a request for correction or rejection.

The most reliable option is to establish a foundation or incorporated association and file in its name. The representative can file as an individual, but must submit proof of the non-profit activities and faces strict examination. Filing an ordinary trademark is another option, but a business emblem application cannot be converted into a trademark application, so a new application is required.$$,
key_points_en = $$A business emblem protects a mark indicating non-profit activities.
The applicant must be a legal entity or an individual.
Applications in the name of an unincorporated group are not accepted.
A business emblem application cannot be converted into a trademark application.$$,
checkpoint_en = $$To protect a nonprofit group's name, first decide whether to incorporate; if that is difficult, prepare to file in the representative's name with supporting evidence.$$
where url = 'https://blog.naver.com/unicpat/224053330430';

update public.columns set
title_en = $$Can You Post Photos Taken at an Art Museum on Your Blog?$$,
summary_en = $$Using examples, this column explains whether you may post photos of artworks taken at a museum on a blog or social media, based on the copyright term and permitted uses.

For classical works whose artists died more than 70 years ago, such as Michelangelo's, copyright has expired and you may freely post your photos. Commercial use, however, may require separate permission under the museum's own rules.

Modern artworks remain protected until 70 years after the artist's death. Even if photography is allowed, that does not grant the right to post, and posting a photo of the work alone carries a significant risk of infringement. The risk is lower when the work appears incidentally in a view of the gallery or when the museum expressly allows social media posts, but commercial uses such as advertising or monetization always require prior permission.$$,
key_points_en = $$Copyright lasts until 70 years after the artist's death.
Permission to photograph is not permission to post.
For modern works, incidental inclusion in a gallery view is safer than a photo of the work alone.
Commercial use always requires permission from the rights holder or museum.$$,
checkpoint_en = $$Before posting artwork photos, check the artist's year of death and the museum's posting policy, and credit the artist and title.$$
where url = 'https://blog.naver.com/unicpat/224043351755';

update public.columns set
title_en = $$Design Infringement Litigation: How Courts Decide Whether Two Designs Are Similar$$,
summary_en = $$Through a scope confirmation case involving a food storage container design, this column explains the criteria courts use to decide whether two designs are similar.

Courts compare the overall aesthetic impression rather than splitting a design into elements, focusing on the dominant features that catch the observer's eye. Commonly used, publicly known shapes are given little weight, and for articles with little room for variation, such as food containers, even small differences can create a different impression.

In this case, the two containers shared a cylindrical body, a three-part division and serrated ridges at the opening, but all of these were known elements. Finding that differences in the shape and number of ridges, the upper and lower projections and the base gave the designs a different overall impression, the Supreme Court reversed the Patent Court's finding of similarity.$$,
key_points_en = $$Design similarity is judged by the overall aesthetic impression.
The comparison focuses on the dominant features that catch the eye.
Publicly known shapes carry little weight in the similarity assessment.
For articles with little room for variation, small differences can establish dissimilarity.$$,
checkpoint_en = $$When filing a design, make sure the drawings clearly show the features that distinguish it from known shapes.$$
where url = 'https://blog.naver.com/unicpat/224004856384';

update public.columns set
title_en = $$A Guide to Design Similarity: Key Criteria from Case Law$$,
summary_en = $$Through a checked fabric design case (Patent Court 2007Heo5581), this column looks at how the court judged the similarity of pattern designs.

The general principles are to observe the overall appearance while focusing on dominant features, to consider the appearance at the time of trade, and to give little weight to publicly known parts. Articles with little design freedom, such as traditional containers, have a narrow scope of similarity, while those with high freedom, such as fashion and textiles, are judged more broadly.

In this case, although the registered design differed in the number and spacing of lines, the combination of colors and brightness in the spaces between and at the intersections of the checks was shared with Burberry's registered color trademark, so the overall impression was found to be similar. The case also shows that designs can be compared not only with registered designs but with known trademarks and products as well.$$,
key_points_en = $$In pattern designs, the combination of color and brightness can be the dominant feature.
Designs can be similar despite different line counts or spacing if the overall impression matches.
Articles with high design freedom are judged with a broader scope of similarity.
Known trademarks and products can also serve as prior designs for comparison.$$,
checkpoint_en = $$Before filing a pattern or fabric design, search famous brands' registered trademarks and existing product patterns as well.$$
where url = 'https://blog.naver.com/unicpat/223991128531';

update public.columns set
title_en = $$Design Infringement Case: Lipstick Case vs. Ballpoint Pen, Similar Articles?$$,
summary_en = $$Based on a consultation about a ballpoint pen whose front end closely resembled another company's lipstick case, this column explains whether design infringement can arise between different kinds of articles.

Under the Korean Design Protection Act, design similarity is assessed only between identical or similar articles. The examination guidelines treat articles with the same use and function as identical, those with the same use but different functions as similar, and those differing in both use and function as dissimilar regardless of appearance. Articles that can be used interchangeably, such as a cutlery holder and a pencil case, may still be considered similar. The U.S. and Europe likewise judge by product category or context of use.

A lipstick case and a ballpoint pen may look alike, but their use and function, sales channels and buyers all differ, so the articles are unlikely to be considered identical or similar. Design infringement is therefore unlikely.$$,
key_points_en = $$Design similarity starts with whether the articles are identical or similar.
Same use and function means identical articles; same use alone means similar articles.
Articles that can be used interchangeably may be treated as similar.
If the articles differ, a similar appearance does not amount to design infringement.$$,
checkpoint_en = $$If your product looks like another, first check whether the two articles overlap in use, function and sales channels.$$
where url = 'https://blog.naver.com/unicpat/223985270752';

update public.columns set
title_en = $$Already Selling Your Product? You May Still Get a Patent or Design Registration$$,
summary_en = $$This column explains whether you can still obtain a patent or design registration for a product you are already making and selling, focusing on the grace period for prior disclosure.

Registration requires novelty, but Article 30 of the Korean Patent Act and Article 36 of the Design Protection Act provide that if the rights holder disclosed the invention or design and files within 12 months of the disclosure, the disclosure does not destroy novelty. Not only sales but also catalogs, press coverage, social media posts and trade show exhibits can count as disclosure. After one year, registration is in principle no longer possible.

For patents, however, technology that cannot be discovered from the outside, such as control software that cannot be revealed even by taking the product apart or a core server-side algorithm, is not considered disclosed, so it can be filed without claiming the grace period.$$,
key_points_en = $$Products already on sale can be filed within 12 months of disclosure.
Both patents and designs require a grace period claim when filing.
Catalogs, press coverage, social media and trade shows can count as disclosure.
Internal algorithms that cannot be seen from outside may not count as disclosed.$$,
checkpoint_en = $$Check the date your product was first disclosed and decide on patent and design filings before one year has passed.$$
where url = 'https://blog.naver.com/unicpat/223935798324';

update public.columns set
title_en = $$Trademark vs. Trade Name vs. Business Registration: Where, Why and What to Watch$$,
summary_en = $$This column explains the differences between trade name registration, trademark registration and business registration, which are often confused when starting a business, in terms of where they are filed, their purpose and their scope of protection.

Trade name registration records a company's name at the competent registry office when a corporation is formed, and it only prevents the same name in the same line of business within the same city, county or district. Sole proprietors are not required to register a trade name. Business registration reports the business to the tax office and creates tax obligations, while trademark registration grants nationwide exclusive rights to a product or service brand after examination by the Korean IP Office.

Registering a trade name or obtaining a business registration certificate does not resolve trademark issues. If someone else has registered the same name as a trademark, using your trade name like a brand, for example prominently on the front of packaging, can infringe their trademark.$$,
key_points_en = $$Trade names are registered at the registry office, trademarks at the IP Office and businesses at the tax office.
A trade name is protected only in the same line of business within the same district.
A registered trademark gives exclusive rights nationwide.
Using a trade name like a brand can infringe someone else's trademark.$$,
checkpoint_en = $$Once you choose a company name, check separately whether the same name is registered as a trademark and consider filing a trademark application.$$
where url = 'https://blog.naver.com/unicpat/223919188750';

update public.columns set
title_en = $$Can You Protect Your Brand Without Registration? Prior Use Rights in Case Law$$,
summary_en = $$Using a trademark dispute over taekwondo equipment (Patent Court 2011Heo6956), this column explains the requirements for prior use rights, which let you keep using an unregistered mark that you used before someone else filed it.

Prior use rights require that you used the mark in Korea continuously and without unfair competitive purpose before the other party filed, that consumers already recognized it as indicating your goods at the time of that filing, and that you used it on goods identical or similar to those of the registered mark. The prior user's status can be passed on through a business transfer.

In this case, the mark had been used since 1948 and continued in use through business transfers even after the original company went bankrupt. Citing export records, catalogs, counterfeits circulating in China and consumer inquiries showing confusion, the court found consumer recognition and upheld the defendant's prior use rights.$$,
key_points_en = $$You must have used the mark continuously and in good faith before the other party filed.
Consumers must have recognized the mark as yours at the time of that filing.
Prior user status can be transferred through a business transfer.
Export records, catalogs and sales serve as evidence of consumer recognition.$$,
checkpoint_en = $$If you have long used an unregistered mark, keep records of when you started, your sales and advertising, and consider filing a trademark application now.$$
where url = 'https://blog.naver.com/unicpat/223909514067';

update public.columns set
title_en = $$How to Search Trademarks on KIPRIS$$,
summary_en = $$This column explains step by step how to search for trademarks on KIPRIS, the Korean IP Office's search service.

Select trademarks in the advanced search and enter the mark to see which goods the same name has been filed or registered for. Searching "아이브" (IVE), for example, returns 267 results across fields such as cosmetics, bags, coffee and communication devices. Because trademark rights apply only to designated goods, narrow the search by entering the designated goods or class along with the mark.

For Korean marks, search again with English spellings (IVE, I've) and compound forms. Designated goods are divided into classes 1-34 for goods and 35-45 for services, and should be stated specifically, such as "coffee" or "coffee capsules," rather than broadly as "foods." For a broad check, searching by mark and class together is recommended.$$,
key_points_en = $$Enter the mark in the advanced search to check filings and registrations.
Trademark rights apply only to the designated goods.
For Korean marks, also search English spellings and compound forms.
Goods are classified into classes 1-45 and must be stated specifically.$$,
checkpoint_en = $$Before choosing a mark, decide which classes you will use and search KIPRIS in both Korean and English spellings.$$
where url = 'https://blog.naver.com/unicpat/223904892013';

update public.columns set
title_en = $$How Much Does a Madrid International Trademark Application Really Cost?$$,
summary_en = $$This column calculates the cost structure of a Madrid international trademark application designating the U.S., the EU, Japan, China and the UK for a brand preparing to expand abroad. Amounts are as of the time of writing (June 2025).

The cost consists of the WIPO basic fee (CHF 653 for a black-and-white mark, CHF 903 for a color mark) plus individual fees for each designated country. For one class, the fees were roughly CHF 460 for the U.S., 897 for the EU, 297 for the UK, 249 for China and 216 for Japan, and designating all five was expected to cost about KRW 5.3 to 5.5 million including attorney fees.

These amounts cover only the international registration; if a country's examination raises objections, local attorney fees are extra. Because countries can be added after filing, it is efficient to start with the countries that matter most to your business and designate the rest later.$$,
key_points_en = $$Costs consist of the WIPO basic fee plus individual fees per designated country.
Five countries in one class were estimated at about KRW 5.3-5.5 million.
Objections in national examinations add local response costs.
Countries can be added after filing.$$,
checkpoint_en = $$Designate first the countries where you expect sales, and budget for office action responses in countries such as the U.S. that require local counsel.$$
where url = 'https://blog.naver.com/unicpat/223896569801';

update public.columns set
title_en = $$I Followed ChatGPT's Advice... and It's Trademark Infringement?$$,
summary_en = $$This column shares a consultation with a small company that checked a trademark with ChatGPT and discovered a conflict with an existing registered mark just before printing.

The company's mark combined two words, one of which was identical to another company's registered trademark. Because each word in a composite mark must be checked for similar prior marks and distinctiveness, the mark was unlikely to be registered as filed, and launching the product could have led to an infringement dispute.

ChatGPT can find products sold online through web search, but it cannot access the Korean IP Office's trademark database. Many marks are registered but not yet launched or have since been renamed, so web results can differ from actual registrations. Fortunately, the company had not yet printed, so it changed the mark and packaging design and filed the new mark.$$,
key_points_en = $$ChatGPT cannot search the Korean IP Office trademark database.
A mark may be registered even if it does not appear on the web.
Each word in a composite mark must be checked for similar prior marks.
Discovering infringement after launch risks recalls and damages.$$,
checkpoint_en = $$Before finalizing packaging and printing, check registered trademarks through KIPRIS or a patent attorney.$$
where url = 'https://blog.naver.com/unicpat/223887208591';

update public.columns set
title_en = $$Understanding International Trademark Filing (Part 1): The Madrid System$$,
summary_en = $$This column explains the requirements, procedure and examination process of the Madrid System, which lets you seek trademark protection in many countries with a single application.

The Madrid System is administered by WIPO. If you have a base trademark application or registration in Korea, you can file through the Korean IP Office and designate more than 100 countries. After a formality check by the Korean IP Office, the application is sent to the WIPO International Bureau, and after international registration it is notified to each designated country.

WIPO examines only formalities, while each designated country examines registrability separately under its own law. If a designated country does not issue a refusal within 12 or 18 months of the international registration date, the mark is treated as registered there. The U.S. requires proof of actual use, and refusals must be answered through a local attorney in that country.$$,
key_points_en = $$A Korean base application or registration is required for a Madrid filing.
WIPO checks formalities only; each country examines registrability separately.
If a country does not refuse within the deadline, the mark is treated as registered.
The U.S. requires proof of trademark use.$$,
checkpoint_en = $$Before a Madrid filing, search for prior marks in each country you plan to designate to avoid unnecessary refusals and costs.$$
where url = 'https://blog.naver.com/unicpat/223882803165';

update public.columns set
title_en = $$Can You Register It? A Trademark Analysis of Netflix's "The Devil's Plan 2"$$,
summary_en = $$Using the registered trademark for the Netflix show "The Devil's Plan" as an example, this column explains that trademark rights arise only within the designated goods and similarity groups, and what to watch out for when filing a famous name in another field.

A KIPRIS search shows that Netflix registered "The Devil's Plan" only in the Class 41 similarity group covering drama-style entertainment and online video content services, and not for game services in the same class or for café services in Class 43. Even within the same class, goods in different similarity groups are generally treated as dissimilar.

However, if a mark is recognized as famous, registration may be refused even in other fields. Filing a widely known name without a real business purpose, or to ride on its reputation, may also be refused or challenged after registration. Ultimately, developing an original brand suited to your own business is the safest strategy.$$,
key_points_en = $$Trademark rights arise only within the registered goods and similarity groups.
Goods in different similarity groups of the same class can be treated as dissimilar.
Famous marks can block registration even in other fields.
Filings that ride on a famous name can be refused or disputed.$$,
checkpoint_en = $$When choosing a mark, create an original name tied to your own business rather than borrowing the name of famous content.$$
where url = 'https://blog.naver.com/unicpat/223871534322';
