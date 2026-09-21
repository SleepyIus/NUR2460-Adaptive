function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

export const ACCEPTED_CATALOG_LEDGER = freeze({
  "schema": "nur2460-c32-catalog242-ledger-1",
  "count": 242,
  "sourceLinks": 473,
  "hard80Accepted": 1,
  "hard80Enabled": false,
  "identities": [
    {
      "id": "cov1-newborn-014",
      "revision": "b10cab37c90c517ac41ca6de2b818204d703687081195ee61973b5474f736296"
    },
    {
      "id": "sf1-q050",
      "revision": "212b64c0b5bc353541bbaaa2df54eb12c862bce7b52f54918267a0753e122a0a"
    },
    {
      "id": "sf1-q066",
      "revision": "ebcec7702e652b30381d1a06e8f36f55ddc1eee4ce85b7b8187ed82ca4fc512a"
    },
    {
      "id": "sf1-q193",
      "revision": "11571b1e55e3fabe719ec3b2d356d4669981b088e31f3de1e6703899e8b767e9"
    },
    {
      "id": "sf1-q199",
      "revision": "d3e047c8199d6674a66220e36313fee3f19243e145ea4dcf0b6e6ca2a9dfa55e"
    },
    {
      "id": "sf1-q205",
      "revision": "1c09839bade2dddc7fa7880ec0e70fc20d1e01949bf12c3e9dcc163a2fb108ca"
    },
    {
      "id": "sf1-q047",
      "revision": "a42e2a5de145049de1fc504ae6d08ddf9380704cf3d3faea89b87d7e35e4403d"
    },
    {
      "id": "sf1-q078",
      "revision": "88b43b56a984081107dfa501fc8afc44cc139e1cfd977a60604410a71181b728"
    },
    {
      "id": "sf1-q206",
      "revision": "656f2fe85a69ed774010050f2198e347f05dca362c5268079b5e18c1a050df65"
    },
    {
      "id": "cov1-gyn-001",
      "revision": "450dcfecd09092ab89a8966f59acc78b681aac6473bb3792ca867e60ff1070ee"
    },
    {
      "id": "cov1-gyn-014",
      "revision": "9845942f9c6a0efe5a80ac10bf5018947eb2c996d7e54b96a5cc88e053bfc673"
    },
    {
      "id": "sf1-q211",
      "revision": "c3826e4e87b1f502e52760f1c862fe1d796d5d4d4ffbe0e7e30cfa7a72d3eced"
    },
    {
      "id": "cov1-gyn-002",
      "revision": "c83f49989e8d2dd2d009e0df4e6d48217e70ef634f4c171fd60b75198f91502a"
    },
    {
      "id": "sf1-q029",
      "revision": "a76afe7cdccefca974a1203cbab98cfe208ee501ad2542ae84ad54522c5683b1"
    },
    {
      "id": "sf1-q264",
      "revision": "03bffb1d2a94dca1b90b2d6f9e48dd6ee74c8ceb7d3911b852949ce7d75e339d"
    },
    {
      "id": "cov1-gyn-023",
      "revision": "b3b54199cb371a6ce67b3b559c1c08142ef55fa67b393177173a7050b4d98dd6"
    },
    {
      "id": "sf1-q122",
      "revision": "28a5095a705861b9a9321db5fb98374a2e19e7ba648ea035d57843edc7b11a66"
    },
    {
      "id": "sf1-q124",
      "revision": "4667a6d99f733f77370b6540514bd610c2febcc4fb22526dd5724883013b3aad"
    },
    {
      "id": "sf1-q233",
      "revision": "cba04eeb524f33fa02885def51362e9c2a1467e1966a15d60704b4a4b12a44be"
    },
    {
      "id": "cov1-gyn-021",
      "revision": "c504889e28b15d18ee5660ccb5246755e439d6d0dd3d34a38ce4562ffc970c3a"
    },
    {
      "id": "sf1-q138",
      "revision": "64683c73e334ddda1a2e2c962d82ed32781268c22c45e4907d3b48ae66299e9f"
    },
    {
      "id": "sf1-q259",
      "revision": "9b1c6e9fe95b6eb63c841e73628b78ef09ba24c62b485bb076126c86af0f896d"
    },
    {
      "id": "sf1-q263",
      "revision": "a6ca16e4c4373f7daa4b701615a01bb533c5cbe48dec1ade7f0cc842959ac91a"
    },
    {
      "id": "sf1-q024",
      "revision": "d971d9e7ab7c8c39560d45d5ef67800c9be00fb65cbf173f7dd80c21a9f05049"
    },
    {
      "id": "h80-q030",
      "revision": "f0a12bdf02eca575032b1695b16b78b9930e478fbd0c5edaa9bf6e21b7d45194"
    },
    {
      "id": "h80-q044",
      "revision": "461485a6476b4a86011103d14e963c64b38d0951eceb38f88e1c6a41a154b605"
    },
    {
      "id": "sf1-q108",
      "revision": "472b427ae277dcb8b53119c8a3f347ce7adcf0d51af6259f81c46d2396fe655d"
    },
    {
      "id": "sf1-q248",
      "revision": "56b1f60bad36a2ca272cf0e45d9039c1bc39b80c5a9f882031ac43792a367dd3"
    },
    {
      "id": "sf1-q139",
      "revision": "44f54b0c7872ec6386d2d4e102e7f0c269ac6afd6362e517487efe543caa30ce"
    },
    {
      "id": "h80-q043",
      "revision": "930857f0b810d6c5b94784faa052e262d301c8088be8f4bd353f1b397ea1d9fc"
    },
    {
      "id": "sf1-q123",
      "revision": "215d1140f5ecfb5f98066b58380073f0d4785f1811a820987e610e54365d73ae"
    },
    {
      "id": "sf1-q288",
      "revision": "393df859906bc1438b81cd35cdfe95803b5a5da18569eacebc9c1c8f72de5297"
    },
    {
      "id": "sf1-q239",
      "revision": "04cc65980125c527b3994a0c977cb44df9c6212de4b3a08232095ac49d75ab16"
    },
    {
      "id": "sf1-q058",
      "revision": "e549d6f4f30c79c0e8e0134919262f3fdc1e33021362ba091c9a715454a5077e"
    },
    {
      "id": "sf1-q087",
      "revision": "43de02fbd79c0bcd4993d173a3fc1a77149a93bd194d8e1b5427d900c0408ac8"
    },
    {
      "id": "sf1-q174",
      "revision": "07f57bfba32309325e632d4d79e70e926b3c6e10494d97c0e6f2289424b662d3"
    },
    {
      "id": "h80-q050",
      "revision": "8049a8435fd4e0432c38cd0e01a3b24d0aae5a9ce78ecee1d9639d53ca01fbdb"
    },
    {
      "id": "sf1-q028",
      "revision": "e9760923824340c93c16d6d9e1275fab4dbdfd2a36763b59a1caa733450b5a3f"
    },
    {
      "id": "sf1-q257",
      "revision": "7ce360505fbf39174e94469bad4daf56edc9b4062586563ba28caa683b4a15b6"
    },
    {
      "id": "sf1-q291",
      "revision": "d36ef7a61eef109c6f5b69c95d4420f3613f23cb669973564b6b2b8174389c20"
    },
    {
      "id": "sf1-q107",
      "revision": "b4c7fbf012211be4707c87a032ef8fc7c2928da92fbd110da9021554b24eaed6"
    },
    {
      "id": "sf1-q109",
      "revision": "016104d4d18d58d4949bb3a7b3b39e21975747114f46e3da42a60ab7e337bbd7"
    },
    {
      "id": "cov1-pediatrics-015",
      "revision": "8bb069db7adbd349224228121ef91537bb3f6ac86327ea7c55f71aa4588990f6"
    },
    {
      "id": "cov1-pediatrics-009",
      "revision": "17607e10b5044f7771bc537f9b784787c3459516b778b6703abeb6ac8de431f3"
    },
    {
      "id": "cov1-pediatrics-013",
      "revision": "085c1835c4e587fd18f331aaf15ae4b39dbddf70f679cf5c27c6c30e4c2d5e89"
    },
    {
      "id": "sf1-q121",
      "revision": "9f4c0cdc83e1e4bf43500748850a023d9589e3efd3f38bd0ca5ebf9bbbb2190a"
    },
    {
      "id": "cov1-pediatrics-017",
      "revision": "a0854560c40e760a7ed3bf2a3e5777c6c38594cad9466878ece29b7ee3967124"
    },
    {
      "id": "sf1-q135",
      "revision": "9c1a9ce9e262b45bf8280c5a5044303172d9a1828114aa0e75f20c7d4e91f823"
    },
    {
      "id": "sf1-q005",
      "revision": "511f2c99c42204d2b78be4ac0d77b027f5991fda99af4478cad9a3263ec89715"
    },
    {
      "id": "sf1-q009",
      "revision": "1420e2c0b8f257dbde34a648cbad69b5c90bbbc318be3596cd6d0f9af9f90cc2"
    },
    {
      "id": "sf1-q143",
      "revision": "aa8e58bb5ebab80e6e5d55fc50080294378532755d89d0f87582dd18fe7f3c80"
    },
    {
      "id": "sf1-q145",
      "revision": "7e3f42478d6963157a5ea1a703544e253037cfdd1a3b261b5c00c04353932339"
    },
    {
      "id": "sf1-q149",
      "revision": "d6cf39666759768f6bf0b45455f9d1baeda51b99f1ebc6b63accfc1a8251ba13"
    },
    {
      "id": "sf1-q151",
      "revision": "2f04ef70f26934a006f7b5fe7e0b2b4b08e718b8a0a1cfab8d6984ea67f93250"
    },
    {
      "id": "sf1-q155",
      "revision": "ce709348ec16ab03455ed20e0e793d8f377774ebe1f1deb27609248e09c83d68"
    },
    {
      "id": "sf1-q057",
      "revision": "be2ab1032dcd141e5a72063e5bff95dadfac8d623b975893b2ae53f4853be4cd"
    },
    {
      "id": "sf1-q063",
      "revision": "897e5a5caf300c61bb44ad032a9c9a74139f304dc4f5d672ca9363a8b6436dae"
    },
    {
      "id": "sf1-q165",
      "revision": "12a8a42a3fe3226b71b84242cc81f0d38622078535e72d1e3fcf2c2d2f5b6341"
    },
    {
      "id": "sf1-q175",
      "revision": "d8e50de8a2bab019a13d8e687722972fe80ac15fb589c95862de88de914452d6"
    },
    {
      "id": "sf1-q294",
      "revision": "98cfa6996dc49268893e204c6f9bd2573b60bf0745bfac1476c688853fa4bdc2"
    },
    {
      "id": "cov1-ob-007",
      "revision": "dff7feae386696d9b28b74caa85d8bff9fa8a90daf4368a60738b25dbf5e7901"
    },
    {
      "id": "cov1-ob-011",
      "revision": "5ff20c8cf80596639f125778a08bf1be6f77038ea0458942d827ee6b27c9e6ee"
    },
    {
      "id": "cov1-ob-013",
      "revision": "7b754ec7d171cd493ccd9b8d30626b8f472ca827d193853a805ee27338e1e4d7"
    },
    {
      "id": "sf1-q010",
      "revision": "f2fe5f8aa9dafcd454a1befd94ec2a85e3f2db28ee2b6c8cfc4ffe7aca1b0b3b"
    },
    {
      "id": "sf1-q012",
      "revision": "65f3c3b8dd3eb53b3aab100c3097ef3d1be0c5b899adf6527a7e50ebd8878bae"
    },
    {
      "id": "cov1-pediatrics-021",
      "revision": "a4821ad9a42def994973b90a0f4058d971f25887048425104fbff4cca6770b75"
    },
    {
      "id": "sf1-q120",
      "revision": "2a0bbcfc97dc2c47492b29c8c692a82505be0e930b6c9437dfccad2a49b072d6"
    },
    {
      "id": "sf1-q126",
      "revision": "f26452c0d2392b017290f29f66803f42e82341a2e7b48ec929da56c95ba61699"
    },
    {
      "id": "sf1-q128",
      "revision": "6b8b46d7d9085e9629216e521cbae739cfc3a1c4f1e4155161ebc3f6746f28c0"
    },
    {
      "id": "sf1-q286",
      "revision": "6573813879ed14daed56f3257b9747b7149f1cfefdd7fc2b4adab66385d621cf"
    },
    {
      "id": "cov1-pediatrics-002",
      "revision": "1b5e406bea0f415da2ede68962cdbbf1337b13ae6d6c6b2c32123a1c4f521f1e"
    },
    {
      "id": "sf1-q132",
      "revision": "df615b66c98b4888b28f3184083f7970460682a4069ea22d139a16212bc6d9a7"
    },
    {
      "id": "sf1-q134",
      "revision": "081e29d2d210d7c4ce1ebe21244c799bce2593e06376a4f48d7a2c8ec40c075b"
    },
    {
      "id": "sf1-q236",
      "revision": "74ea9e46f1376817eb46db3e70f6a318b05f0be29744817b74536fc96c6c7195"
    },
    {
      "id": "sf1-q251",
      "revision": "305bb89c7f75003082b687b24a4219e874430f5d86aa7eda9377eb23717f5d0b"
    },
    {
      "id": "cov1-pediatrics-005",
      "revision": "0a0ca2c29597bb742c7f9f516107e4ab0c5d38837899bfd47ec255d88a52ebd0"
    },
    {
      "id": "sf1-q001",
      "revision": "ad0cb3df0edd20ee6f013f5cdef63c53b1a8d55d34a89d9529c5f12f751b9d30"
    },
    {
      "id": "sf1-q007",
      "revision": "1c7c5e89124bb8d426b782cb5ee1c5990278d9a6b8265dd6a35be5dee6ed5b43"
    },
    {
      "id": "sf1-q141",
      "revision": "6ea888f8ff41045cc739c37782992fd7a33b96da2535435f9bdd71762c2c3a28"
    },
    {
      "id": "sf1-q147",
      "revision": "30249643893915f35eb909adaf37431f3d8b2d366f9b02fed28105135e76d663"
    },
    {
      "id": "sf1-q176",
      "revision": "2388e60c43c52bd68eb12e613cdde66b70cc9cb90abea68b466091fea68a471f"
    },
    {
      "id": "sf1-q182",
      "revision": "d181b4f1e5aaff23314da0ff773a93ff01fff19c27dc0c5fbcfb7a0cebe096fa"
    },
    {
      "id": "sf1-q016",
      "revision": "74a3ae809cb233c60c18224a032f9466601f721390e965cd4fa3f0962e066e36"
    },
    {
      "id": "sf1-q018",
      "revision": "93a13782804e8f815d07fa8207b46fe6c58469f21fad8fe5c61aa3f34cd5477a"
    },
    {
      "id": "sf1-q020",
      "revision": "7b9280735ea6ccb67a028c4df4102ea0015f5f94cee950b99ffffcd806a22c24"
    },
    {
      "id": "sf1-q022",
      "revision": "57e9e3cfc247d02b7431ff1c0aa1418161c281fcd685e9f3d2d5cc41db359a98"
    },
    {
      "id": "sf1-q026",
      "revision": "0544326ca28408fd7905da829b171f2a5a60d78359fd1fa0f7647eddd7380bb8"
    },
    {
      "id": "sf1-q030",
      "revision": "9ed6a34837ae794768dbe993294e41d39dc0bbd4ac5a5879a05845ec8c2d0a24"
    },
    {
      "id": "sf1-q036",
      "revision": "e32018ee88aac12663e1f2d8b09bab8f2e2e31ff494a15f6083a0dc84dac43a3"
    },
    {
      "id": "sf1-q038",
      "revision": "b8dc24690218d3c744e496e29ee7b8a81374691d9310eacac4a504cbc30fbecf"
    },
    {
      "id": "sf1-q178",
      "revision": "852d12628358c2eb9fd59c28a3939c780fa9b6b7269a2469062ca1a879c85238"
    },
    {
      "id": "h80-q034",
      "revision": "15457370f54417d7d28316d775e68932f8ffc0aa1b74263656908b024ce0331a"
    },
    {
      "id": "sf1-q017",
      "revision": "1c13d2b13d0fe8a6bf50604a9877bdec4745ea05c8f3f1483846b0b8c7d3e8af"
    },
    {
      "id": "sf1-q019",
      "revision": "a90819344c0cdaf52db3d6ac91674a5614468a49a6a692bd1001ed17974279c5"
    },
    {
      "id": "sf1-q023",
      "revision": "4a10dad83f0392bd748c62d199b3868cebef4d2e578b2e6395e07866c077ee24"
    },
    {
      "id": "sf1-q027",
      "revision": "71140ce92a47b98f742e435d49fe7ad8bfcda2f9ae5b85e5714ed9acf5ded4d1"
    },
    {
      "id": "sf1-q035",
      "revision": "9be813e481077e83116b600a3f09612596ed27e0733df195df5f15d40aea649c"
    },
    {
      "id": "sf1-q039",
      "revision": "cd274e8fc0f9459058c706e983f33ff0be6859d0c853d8a26aea464c2dc95be0"
    },
    {
      "id": "sf1-q161",
      "revision": "2c06f364c2b4ca382c4138acd07ce58625b7e0c730a83388881a8e749051f32c"
    },
    {
      "id": "sf1-q163",
      "revision": "5652ec671a82dd02541b51de504540781d4cb45defb1829d2bf484ccba024983"
    },
    {
      "id": "sf1-q167",
      "revision": "b28a44ba2e2821bcbab66d9b8f81f6789f2a0704f33d0f81aa94cec5484d6ecf"
    },
    {
      "id": "sf1-q249",
      "revision": "c684be509d778ebd357e8e5259bb760ce17325b7e420cd8bfad9d66f48198acc"
    },
    {
      "id": "cov1-pediatrics-014",
      "revision": "3ad6eb4ba99fbc4291efafa95fde88c5599456973fc4e56586115656af99f677"
    },
    {
      "id": "sf1-q125",
      "revision": "4e7ff3dc8b3c712986ab9cafb12929f68dccee5cb490312f43171d14fbb6bcc2"
    },
    {
      "id": "sf1-q015",
      "revision": "c4edf47913b3a54b84bba1278d0a6b2a49a580eed33810cadb5a6088f8ffc892"
    },
    {
      "id": "sf1-q177",
      "revision": "9dfc5d9ac4424d5bb28c73c70d4c1fe9476270adc52c365f0c7e9e132ba2bc1d"
    },
    {
      "id": "sf1-q185",
      "revision": "a60718f15c0e3a1ca376d5aae80a9e744eb39c4f0480fa98007db8c10270beb6"
    },
    {
      "id": "sf1-q033",
      "revision": "9c4f9c5215481b7567c9900b5461cdc5304a79a9b144dd93f7bf99c5d854a88e"
    },
    {
      "id": "cov1-ob-012",
      "revision": "3a1b2afc99d953c62a6d7880d05cbac0d4c7add67829325dc699c21a0de7be50"
    },
    {
      "id": "sf1-q242",
      "revision": "bb33593833f6a7b59c11aea9399f9ba76d47def520d93369dedb10dbef2e3767"
    },
    {
      "id": "cov1-pediatrics-004",
      "revision": "919c741d8bb085e51a62e01cece9ac169176e3138012e9fecd96e0f4ec29c15f"
    },
    {
      "id": "sf1-q181",
      "revision": "3fa4502df08dd132f2e7416c70a6d7de9a9ff796b31c862249a69bad69402614"
    },
    {
      "id": "sf1-q189",
      "revision": "872fbbaff10117f73859501f14d6313d00300400096d267d57a7a7f3626f8bc7"
    },
    {
      "id": "sf1-q131",
      "revision": "c4c6bc42d06d36900031dc33201df5393c4dfd26597281629e563cb5897f3c10"
    },
    {
      "id": "sf1-q133",
      "revision": "7c58ab57a8abffcc9c99a0041da74629da3d3daa586433d6856b2e3661bd1fdf"
    },
    {
      "id": "sf1-q137",
      "revision": "9de5fcd43ed290fab9754e9e456a82c0df329d0ea37c634e93b0b5bb63c46181"
    },
    {
      "id": "sf1-q237",
      "revision": "2f4bad992fe039498811e83d451fb6d03073024006bd9deb3ef6ce8fbdb5b974"
    },
    {
      "id": "sf1-q290",
      "revision": "aee62052c7dc251b9496086fbdf4347ba13259d3352cd8c935f3cae1b52f2137"
    },
    {
      "id": "sf1-q292",
      "revision": "d374ae495db6185cd75f10cd2f18e0cb9acd2292022036b4aeccceb574fa2946"
    },
    {
      "id": "cov1-pediatrics-006",
      "revision": "fda3d8ee46b05d4da5968e39f21d97f172af82b44dd93b24aab31cab4b9bc638"
    },
    {
      "id": "cov1-pediatrics-027",
      "revision": "ab23c051829c36e93d3a982e04b19404d748c3d6e63810f4a7c6f25a47eb694e"
    },
    {
      "id": "cov1-pediatrics-023",
      "revision": "b097ac440e8ba3e3ec23667bd7b9c5254ba9783aee6d8a559f557bacba331735"
    },
    {
      "id": "cov1-pediatrics-024",
      "revision": "e87d03532e12a3c5775f276d7b6e7157804bfddb632d41ec5aeb4276e8f71a83"
    },
    {
      "id": "sf1-q170",
      "revision": "a753d2f999499add6f23696eefa4d22da399c8e676bb789e50b1aec4169ee010"
    },
    {
      "id": "h80-q051",
      "revision": "e33fbd82b56335094f8070da081b91783b5ad10edeb8a5a46d9d3fb2b9e36cdb"
    },
    {
      "id": "cov1-gyn-022",
      "revision": "6d7e7c9ccc5866dd3e3b9264c182d335b68bc12fe7c0540ac671381fb9959097"
    },
    {
      "id": "cov1-ob-001",
      "revision": "a473028b5d2094789a8d3759d3be03f59ff9989e89e9f9952a593e301108d9a2"
    },
    {
      "id": "sf1-q295",
      "revision": "0c4794c25a73183466815cfeb05eacf70693df07499dc176bf73afd116c25a46"
    },
    {
      "id": "cov1-gyn-010",
      "revision": "b95823274ef3b0ff3116f94b02630e96a94c88bdaf53745e4c7b02037c5d12f0"
    },
    {
      "id": "h80-q001",
      "revision": "04c28434843d38de7e8730b095f9ec6fac29f57a1e59c7a31b5a0d812bfee41c"
    },
    {
      "id": "h80-q015",
      "revision": "2ef9a0e63bf6dba823d45b3d796893bc0c344ab187b9161cb091c050fdaa0d98"
    },
    {
      "id": "sf1-q070",
      "revision": "62ea23e46e5abb3c0aaaf87e8ce69a57308080ce060fa592118b268cd30ceca6"
    },
    {
      "id": "sf1-q081",
      "revision": "eb531ebdcaa60d9533a82bed9c87ba39f91c50dfc0529117f1601597d5b305f7"
    },
    {
      "id": "sf1-q269",
      "revision": "09aebacb7e4c9ce45cefed1513d79a79b76388e7e98edfd89fb4555d1bdffaf8"
    },
    {
      "id": "sf1-q244",
      "revision": "b2f10040094a07a4bbb50a705aeefa9a22bba8cfbd9b8863522b47d465223929"
    },
    {
      "id": "cov1-gyn-006",
      "revision": "b9eb7e8ee9696315044920d0c676e878f8fb42b249ea5b681eae527a774b1363"
    },
    {
      "id": "cov1-gyn-013",
      "revision": "fccf7e248b480a2ff59df3c91ef4ec97e3c3a3453e19a8b8b7ccc1df50f061e6"
    },
    {
      "id": "sf1-q282",
      "revision": "7a99cf3d5f6680929b6b2db438e5db89651cb1b19f38918bbc79263bfb64c6eb"
    },
    {
      "id": "sf1-q052",
      "revision": "ce5976b6b5a6ea85809a1bc8d23f6cac2620f946a0aaffdebb1311a11f295a2e"
    },
    {
      "id": "sf1-q054",
      "revision": "b5b1e827836a6412b7d453b7e77e54237174ee122a1c6ed45e19d0469ea3eee4"
    },
    {
      "id": "sf1-q040",
      "revision": "533ecd372507741800bcd573eb3ea65859990da8b7cb905a1f12cf583520b1d7"
    },
    {
      "id": "sf1-q042",
      "revision": "13f24c0fa7b527d4172a2282ecbb9feee13771242ed3ae5df0d2cd57fd16d435"
    },
    {
      "id": "sf1-q044",
      "revision": "8fc32ec13d311d2a02060fed9d10b230e78aff979d043dd4bbc5aa213aa62a7f"
    },
    {
      "id": "sf1-q046",
      "revision": "d13001286c004bda7fb05cab2124f2016463af266e0d553fd0f31716bc927acf"
    },
    {
      "id": "sf1-q056",
      "revision": "8121ad0f517aec181e0d29cd353da820c44eddb01460545d20125d00b163e631"
    },
    {
      "id": "sf1-q064",
      "revision": "3ad994e40a943b741a314c2da792698442b120fad14825994764e23f787919dd"
    },
    {
      "id": "sf1-q068",
      "revision": "647092aeeb4cbb1168421a08eaee4bbf3a1709e7792af13e3066441a008ef64a"
    },
    {
      "id": "sf1-q191",
      "revision": "abf2387d2390e6585d89e19695840e17dcdba74e54cf2fbfe8a56ab7a0b85fce"
    },
    {
      "id": "sf1-q195",
      "revision": "7653a6f61679b2b1b6b9589096a05f4b772cf96f4b7c83ba0e3ddc096c3481fd"
    },
    {
      "id": "cov1-gyn-015",
      "revision": "9831be70742b9de96ca6da71cb4b79e7f437bf3f4cb28a5cf04276de60e1ca24"
    },
    {
      "id": "sf1-q043",
      "revision": "57c1233dd9f9e27c8b832ac36beb1eeee71c26472fe502042ae17a08d0462da7"
    },
    {
      "id": "sf1-q048",
      "revision": "71883eb9d840ccbead71c34671b797aae3b4858e7301dfebc5dcdb82988f4ac7"
    },
    {
      "id": "sf1-q062",
      "revision": "bb9a51342d6710a1b0174be73984ceaed60a46a0617f7986c127bd95ec4d12b5"
    },
    {
      "id": "sf1-q271",
      "revision": "ef859eec3b1985a0e247c11710a3bf7a9ae547ff9fd7823fa23dd91be49a75fa"
    },
    {
      "id": "cov1-newborn-006",
      "revision": "5c6c59be7fe844fb721798401a77c5d956bc4c4f3640a3cafc0ed9cdd3b151a3"
    },
    {
      "id": "h80-q022",
      "revision": "ccf713c042c858fdd0ec44e440cfe36fbbae5ddd5ceaf46df2a3e50c235405f1"
    },
    {
      "id": "h80-q011",
      "revision": "fa592aecb438a0fd9ffd6e058223ec1b64b800aabd76cd16d56b4aee4732b742"
    },
    {
      "id": "sf1-q285",
      "revision": "e18cfb056ae209b0d0aafffc93d03a14104b9aaaa9a67710b50522ce2a4be7b7"
    },
    {
      "id": "sf1-q067",
      "revision": "9e34c32aec710efcd500b21a6d3e3c30266a46b0b3940184ea2f0bdb980c3654"
    },
    {
      "id": "cov1-newborn-004",
      "revision": "0eb0474ff4a5832040972e3b68e843c6dbc3590c27654ef5dc7b8f558c3e5562"
    },
    {
      "id": "cov1-newborn-007",
      "revision": "be25930392943ca189f1e30d6e3de0ebe917ad592bb3690fbbc362029c629903"
    },
    {
      "id": "sf1-q045",
      "revision": "0c94425924386f5d69a1d7fc3838f9e9b848d00eaaeb42d14a65b216f58b70de"
    },
    {
      "id": "sf1-q069",
      "revision": "10b86de776ee05111669033bcf7bafe4dfa36297a6552346c29d944ead392532"
    },
    {
      "id": "sf1-q198",
      "revision": "c9dd671401b46caa4cc75c85472c1c4886427acebe2ba3434fa1a3e9c1588554"
    },
    {
      "id": "sf1-q200",
      "revision": "bb5ca1d6ffaaf20f8fe9165b3cb065f6c54e27883066d26ab06386a2ae43ff4d"
    },
    {
      "id": "sf1-q065",
      "revision": "c81f04ea83a0d04bfa94bebd3228f14318c959fca1d8b971589e8d9b02c761a1"
    },
    {
      "id": "sf1-q041",
      "revision": "bd5442df440fce1ff56071e612969eb021d79e0a747e833623865dd1519e75eb"
    },
    {
      "id": "sf1-q246",
      "revision": "8d2bc94eb3da749ec76be43be5bc552333ec44273095d203d46da4e84647a0a7"
    },
    {
      "id": "sf1-q053",
      "revision": "7d394fa05931777dc2e0290d2f5f86cc3484658732e4f9a44814afe9692b1b8b"
    },
    {
      "id": "cov1-newborn-001",
      "revision": "c0cc9989b93f5976716f53bc0d5c827ebf5583f35e1eb6a2d5184b0dff83ac55"
    },
    {
      "id": "cov1-newborn-002",
      "revision": "6dfb0220a3e30600df2a90aa1e0e777fbbb7e8912e82d5db31c11d64646c96fa"
    },
    {
      "id": "cov1-newborn-003",
      "revision": "e67b6902381402b4d3799e486c380d7f83ba9b09ee1d54de6c6ede1a5dcf94ee"
    },
    {
      "id": "sf1-q197",
      "revision": "f828f607a65536f938f14fd470fb110c5a4f173c5d5c681b485c2254307e4b16"
    },
    {
      "id": "sf1-q201",
      "revision": "049287d75330f74980eba5a33b97c6990e3d9a4a270a8bbf6fb8372b0aa578ae"
    },
    {
      "id": "sf1-q203",
      "revision": "f08babab1941be1737291c96134f957718404c3474cbaaed0d40ad59d9f306b7"
    },
    {
      "id": "sf1-q154",
      "revision": "c531df3df409a5a3f64479b1ddf6c27624c8312652c86a827fdf67313d6a98a6"
    },
    {
      "id": "sf1-q202",
      "revision": "22e75d54800ca7f5eaee45a679662cd46d7b0a467576c7b405a4f77dc94067be"
    },
    {
      "id": "sf1-q061",
      "revision": "7f13d6a376a47da2ea9faf868b960118aa907f212407f134847d8b06a5ae4003"
    },
    {
      "id": "sf1-q194",
      "revision": "33d9d8778c290ae093f11e7b411cba9346ddf2be4ef1a7d2edbed245753f8041"
    },
    {
      "id": "sf1-q114",
      "revision": "6eaf86a4230c42d8901abdef6c574a1bfbe17e36ecfb7d6b7b145c812fdf7647"
    },
    {
      "id": "sf1-q184",
      "revision": "729d7d5bb6fcfbba6ddc5b6a441cbeacf409aa1f3980f058225fd62af24304ca"
    },
    {
      "id": "sf1-q186",
      "revision": "df852d1739fc89cfc7cb1550e601fc46d720d9b229256d127bf09dcf67f89bec"
    },
    {
      "id": "sf1-q190",
      "revision": "a0cce8d53bb2edc9af015cc1cd97e59750b95f70dae376d3817b31959bb52350"
    },
    {
      "id": "sf1-q002",
      "revision": "d129b67ecf585b593444d40ca9e97cc591806601b4c47a31c263e0a8f1188b8b"
    },
    {
      "id": "sf1-q004",
      "revision": "8f376ff410ff72d50e3485573bd5a44deafeb8eebef8aacab1aad71ee2307d22"
    },
    {
      "id": "sf1-q179",
      "revision": "fa0d459a7d30ed89de420f7f9225ccef8828041bb91bedb306dbfb3c2252bac0"
    },
    {
      "id": "sf1-q150",
      "revision": "2f59119ae73947ab79b5b4a2dbbb304f59eb7774adae681072fbc4c45fe5e1d3"
    },
    {
      "id": "sf1-q152",
      "revision": "001ffdacb0cc2a956304fba4cfeafd5864050d7d28e67ea701932d55b2546dfc"
    },
    {
      "id": "sf1-q156",
      "revision": "54e45ab49f75426f46c13698e51cf95b07061258168aeadd2b47e051bb6b3a9f"
    },
    {
      "id": "sf1-q158",
      "revision": "b91e03b6cae047d13d4f86b69cdf3d194555e106769669461696f72e912999fd"
    },
    {
      "id": "sf1-q160",
      "revision": "e8c94c005000c1d3bb9cd352b352cd28c44e2f7f2890a5acf9ed051130129131"
    },
    {
      "id": "sf1-q166",
      "revision": "3b771b07f93990950981cf72ea8ddfe65ace5e8c59edfcb859b78e9055847eea"
    },
    {
      "id": "sf1-q100",
      "revision": "7429096b0866231d35f69fe36ba5854fe70e072ed2aced0e599b57b62d809808"
    },
    {
      "id": "sf1-q102",
      "revision": "f74ac3b693ae69d3abe1782ca9ba5d5b6a895cc65bca3e301508827b291565be"
    },
    {
      "id": "sf1-q106",
      "revision": "6b474ef8b7a9eabe4b99d39445f21f6429d1e452ae7eeca437b2ca111b597b47"
    },
    {
      "id": "sf1-q110",
      "revision": "723983f4ce5e7bb585c4fcc7ae1b56c25473cf341bc495ba0882b863d01d1144"
    },
    {
      "id": "sf1-q112",
      "revision": "93292e169bbae4924e136467dbfdec0f6d5a11f9f740589259940d03f01601df"
    },
    {
      "id": "sf1-q116",
      "revision": "1d5bc3915daf42013b1a5b50295d064150874c7ac6e27a330f487eb308b38070"
    },
    {
      "id": "sf1-q223",
      "revision": "13f435ccb0f18a7c99ad569e8d2cdf3c7f782e22215f22289be1e35c0d74a245"
    },
    {
      "id": "sf1-q227",
      "revision": "e5e8831f16cfae481f5e044a0027320f309c4f46141e058bef035c239b8a21aa"
    },
    {
      "id": "sf1-q101",
      "revision": "382528028ac4f746918a88e06cf55d69a029be6541f4d7d5197551f881c3e3eb"
    },
    {
      "id": "sf1-q105",
      "revision": "213cce433401459268eb876e8bac91f3ea7b34cbcdd1d94ce08abeb5ce8810ed"
    },
    {
      "id": "sf1-q226",
      "revision": "d38dcabee825925a9e447f0c55262856cd579c767e51906c18f77b958697b281"
    },
    {
      "id": "sf1-q129",
      "revision": "40eefc5c1418db35cc8ce667d1a2669bbd8ff8b5f2e73e3011a9c73724a36768"
    },
    {
      "id": "sf1-q241",
      "revision": "064e665551ecb4bbb23f54febc3e09cec146742b4bdf3e8ead061ef597a50633"
    },
    {
      "id": "sf1-q025",
      "revision": "e3b6b9a3d957c5d7d1bc7913291635cf60b0d1a8c943e213d87c74201eef0e6a"
    },
    {
      "id": "sf1-q229",
      "revision": "5c8898727ae50dfca1f775a0e2938b4350ed8027aed94d9464181987a1e453fa"
    },
    {
      "id": "sf1-q153",
      "revision": "a9f65104aecb34ad6fd555ea05dd726d2974f8ed91d56839e2cf9f0674d31cec"
    },
    {
      "id": "sf1-q157",
      "revision": "99d596918b98bc5d68acc8f1d6ebee15017558559baa014bb55d1226570ef4ca"
    },
    {
      "id": "sf1-q159",
      "revision": "9a7a480eb82e92974a4a246aa02641bab1f64139e92eac6e29d2952301322302"
    },
    {
      "id": "cov1-ob-009",
      "revision": "e3fff7d20f88b5f87abbcd86a01462c2e4a3cc36467f216a734b8f1af0d744c3"
    },
    {
      "id": "cov1-ob-014",
      "revision": "b86695a2f195860c654e627ddf49725b293d44a653a13bc8dc156e46e60ed8bf"
    },
    {
      "id": "cov1-ob-017",
      "revision": "175a41109eb0c4a3d91d1db9872b27f9464bdfa85fd380c78e89ae1c16f6f13b"
    },
    {
      "id": "sf1-q188",
      "revision": "6e6bc1e21ccbe36b9e00bb80a849c206f24fa0b5b7689c6ab08c9cb2757a7bb4"
    },
    {
      "id": "sf1-q245",
      "revision": "1e066151149ec4a6587c27c3af2159c6fccf4a78fc4bb5108c2370cce437f37d"
    },
    {
      "id": "sf1-q267",
      "revision": "f3c12c8043b70d074b1995774cad8599fa4f491dcf8d6c232beb2754997b3f0c"
    },
    {
      "id": "sf1-q289",
      "revision": "385928f712624c74e1d6c8bb09e994eb38e1aca9bff119dc8d27dd6a29503aac"
    },
    {
      "id": "cov1-ob-005",
      "revision": "cf643f8796f5d97a4234bce2fbda03d76c0845b2df5d38b1350dc7f63cc8dc64"
    },
    {
      "id": "sf1-q142",
      "revision": "3552addbb82d281d12afb1447fcf77eaeca765685a98de405f9a010c4fb4f699"
    },
    {
      "id": "sf1-q144",
      "revision": "75c8460c45440c66fb06dbf9b4cf22f2fea962040656c844bf140e1d99289694"
    },
    {
      "id": "sf1-q146",
      "revision": "5b5a2913f50aeb3b4c91f8462a751d7998e8a6f15bccff005d1556c50b311ca4"
    },
    {
      "id": "sf1-q148",
      "revision": "29ad0478d4799db34fabde005585446331aff8b120e21108e94bcf39699effcd"
    },
    {
      "id": "sf1-q162",
      "revision": "3aaf98320fb70eb9023d979a05f5aa64cd6f41fd74f08770ac5c4dd3e29eaee8"
    },
    {
      "id": "sf1-q003",
      "revision": "9fdb10597b835c89386d52c05ab16c50f36a11325d0a0f0aaef6d8ae80ab0047"
    },
    {
      "id": "sf1-q171",
      "revision": "9e114aa5225c75467af2bea41ab549aaf9a37c808b3a9980f16f030ae4abc933"
    },
    {
      "id": "cov1-ob-002",
      "revision": "05607e57b81de1ba5caf76e74d22b7d7069c1b5e016ae5bd272062cc997e2948"
    },
    {
      "id": "sf1-q168",
      "revision": "921c4fe835ee5ebf1732bdede046f14cb3e19af6f3484ec706468674aa08b629"
    },
    {
      "id": "sf1-q260",
      "revision": "1e0bea2d35f21d4a0c3382a225d515226e3a46739c8a5ff86a910e3579a1cd45"
    },
    {
      "id": "sf1-q296",
      "revision": "64550ca7354c771a668464f2568752cd5f7ee8d34d8cc7f10ef78a0db4f08001"
    },
    {
      "id": "cov1-ob-003",
      "revision": "db244a558972cabe612099b9482db21f867b58428527390f249578a8cb6bc7e4"
    },
    {
      "id": "cov1-ob-008",
      "revision": "0ed9a4320ca2aa091378eea180ad3a7c266e4e00a4e9c5881918ea1bf16ff160"
    },
    {
      "id": "cov1-ob-010",
      "revision": "69c3e8b0216415f31bc573f4f735d6dca5d36dbb07aea72eb45a941a5f618599"
    },
    {
      "id": "cov1-ob-015",
      "revision": "f416382ce2635f578d1e33afbbfef738f7c21eb54e7f5630c575cc4fcae0cce2"
    },
    {
      "id": "cov1-ob-016",
      "revision": "6fda9c7d6afefc00bfe4dfc30692cb0eb943accbcaea3da81bad8bcc3de9844b"
    },
    {
      "id": "sf1-q183",
      "revision": "be6e56e6e16f7381486d8adc2f792581a9f81104f6ac5487ea30c9dceb8744fd"
    },
    {
      "id": "sf1-q243",
      "revision": "7b78ddc4eb3c308cffccf7cc6b55e03410e1277cfab31176812bd59cefd655ce"
    },
    {
      "id": "h80-q049",
      "revision": "42869dddf9a9af49b54a081d69b40bd945eaac5685f2386de5d7f1102ac22cf4"
    },
    {
      "id": "sf1-q140",
      "revision": "c5d77f77a07bae79704c181dace5f6914e397da17b5f4e04fb311c2667a77cdf"
    },
    {
      "id": "sf1-q164",
      "revision": "7f93ab27ba7cb4ccdbb4f22d8533e805e03ca2574ed5cac4b307b8a336e5e280"
    },
    {
      "id": "sf1-q298",
      "revision": "1eef26bef9427534548a9acba24f051fd30bcbf69f950c7b8c10a2bafe26baa5"
    },
    {
      "id": "h80-q042",
      "revision": "91dd6f909a4a1fba3d49102fec519d561006eb8990b54e6713fe9eda6c87c8d2"
    },
    {
      "id": "sf1-q265",
      "revision": "7551b4f245887bd036266aaa32dd8ccaa2dc8fa9adf51e7961eddb6df2f82507"
    }
  ],
  "publicQuestionFingerprints": [
    "943bff81",
    "bd0abb86",
    "fdaea096",
    "bb73d2e1",
    "1343ffd7",
    "36d73919",
    "61f26f22",
    "efc37fa1",
    "578fe3a9",
    "f96cc7d6",
    "fd5a518d",
    "c6569acb",
    "8897ad4f",
    "38ba40a5",
    "e52eaabf",
    "353f124c",
    "580ae596",
    "46acb651",
    "47511303",
    "7ce68d81",
    "4d9f3629",
    "e065b7ed",
    "392e5d2d",
    "3827d1f9",
    "97ff26b1",
    "15d6a916",
    "b3f74081",
    "bf3ac375",
    "dcb253db",
    "eebc66e5",
    "8f090f6a",
    "bb9ebd9e",
    "d508a0d2",
    "a4068d33",
    "ba14aef7",
    "87607c26",
    "231d194b",
    "81101842",
    "d439d160",
    "60b44ee5",
    "61044229",
    "9beb7126",
    "58d95dac",
    "a750c835",
    "0e91f356",
    "2585dd95",
    "f41f8656",
    "d99298b3",
    "774cf330",
    "e068d53e",
    "dae14378",
    "cab2ab55",
    "d761950d",
    "b095b4c7",
    "5fe609fa",
    "1c45fbcf",
    "f1910bfa",
    "f44410ee",
    "417ba0eb",
    "3dc7b677",
    "90f21608",
    "93d825e7",
    "060ef51f",
    "6ce68516",
    "2e3f5b4c",
    "ea5bb55a",
    "3f2ce787",
    "fc70d321",
    "67a733d9",
    "8aed558f",
    "18ddcbac",
    "8012391d",
    "5d06aacb",
    "bf5c7264",
    "724164c3",
    "a88baba1",
    "d2c59a98",
    "75972437",
    "01d72d11",
    "a995b6b4",
    "a5354e49",
    "aab07a98",
    "388c36c2",
    "c3684e8a",
    "2c77522a",
    "6428cc19",
    "901f9e5b",
    "64e2ac56",
    "6168ac1e",
    "795c0815",
    "e6ce2564",
    "47c4db21",
    "851c3b7b",
    "414e7b9f",
    "9d40bbf2",
    "8278be32",
    "3188d755",
    "1631cf0e",
    "d6f25b08",
    "4fcf1e5d",
    "2b785b57",
    "ec80c58b",
    "e732f975",
    "ce42ea6f",
    "b57c4d7e",
    "96dc1eaf",
    "adbfcb32",
    "11f5a2cf",
    "5a1ab596",
    "5582b675",
    "dc295878",
    "d12679c6",
    "6a136d1e",
    "39fd157b",
    "5b0ab7b2",
    "0a7e05b4",
    "17536c1d",
    "788b7a5b",
    "314dc654",
    "503579d9",
    "58223612",
    "c791721e",
    "a4696db9",
    "3e8ac11a",
    "96a916af",
    "fe8698b9",
    "69428a59",
    "dd6324ec",
    "9fd361b7",
    "7726e9dd",
    "f0bc26a3",
    "53fe2b8e",
    "c7bd8687",
    "2c5dab67",
    "d0300776",
    "03073ffd",
    "a0e91b17",
    "2e3b6d02",
    "d7b34562",
    "9a30dd49",
    "203d5060",
    "e0977eb8",
    "882d371e",
    "54644427",
    "5e0463df",
    "13d7729a",
    "30a7e413",
    "fb0a80a1",
    "3aea49ce",
    "0fe91de0",
    "8bdcc0f6",
    "27e45dbd",
    "eacd0726",
    "35893db9",
    "15c2ea0d",
    "120e42a0",
    "b5874068",
    "2a68c290",
    "e232a29d",
    "0714d8e4",
    "0586a34e",
    "7b299bcd",
    "e517b621",
    "e804825d",
    "eee157f3",
    "362063e8",
    "58575550",
    "4fa51038",
    "736e1ada",
    "15fda97a",
    "e107820a",
    "c0d44a4a",
    "f83abe4e",
    "80800282",
    "fae90109",
    "b584a1fe",
    "0a9f2d36",
    "fca45865",
    "cf5779ed",
    "46113fff",
    "f7f99750",
    "dc17f4c1",
    "b3c6a126",
    "2dd9c196",
    "fcb48565",
    "01202360",
    "47137a8f",
    "e1bbf666",
    "14d21c06",
    "76c94501",
    "6f4e8e5d",
    "792a3d75",
    "e549c3c8",
    "4e6e6e3e",
    "e08521bb",
    "cb87d9d4",
    "50bc82a4",
    "19aabebd",
    "72f3c9ef",
    "9fdef7a2",
    "84a51396",
    "ace15313",
    "9f2c8bb7",
    "106a4998",
    "6a97660e",
    "8200fc12",
    "513d81fc",
    "f0912bf2",
    "7f563883",
    "3bbf25d7",
    "bf1d9539",
    "9f1b71d2",
    "98f61286",
    "4451f150",
    "ae633dc4",
    "72d3c70f",
    "ca262602",
    "1a166b1f",
    "5ad1c535",
    "40d32b9f",
    "160a90f4",
    "7436acb8",
    "9eb869dc",
    "c8b49328",
    "e3cd6b46",
    "c28fcd33",
    "1f1585a9",
    "d5c0631a",
    "9d04f28f",
    "c1fe406f",
    "ff05c922",
    "5f4f606e",
    "63c224d0",
    "3ff62671",
    "7ec2d7d2",
    "9c40eb7e",
    "2ee93136",
    "35e01a5d",
    "2fdcbdb8",
    "1be23af8",
    "831a2d3c",
    "e9ab7e0b"
  ],
  "legacyNullKeys": [
    "sf1-q087@43de02fbd79c0bcd4993d173a3fc1a77149a93bd194d8e1b5427d900c0408ac8",
    "sf1-q005@511f2c99c42204d2b78be4ac0d77b027f5991fda99af4478cad9a3263ec89715",
    "sf1-q009@1420e2c0b8f257dbde34a648cbad69b5c90bbbc318be3596cd6d0f9af9f90cc2",
    "sf1-q143@aa8e58bb5ebab80e6e5d55fc50080294378532755d89d0f87582dd18fe7f3c80",
    "sf1-q145@7e3f42478d6963157a5ea1a703544e253037cfdd1a3b261b5c00c04353932339",
    "sf1-q149@d6cf39666759768f6bf0b45455f9d1baeda51b99f1ebc6b63accfc1a8251ba13",
    "sf1-q151@2f04ef70f26934a006f7b5fe7e0b2b4b08e718b8a0a1cfab8d6984ea67f93250",
    "sf1-q155@ce709348ec16ab03455ed20e0e793d8f377774ebe1f1deb27609248e09c83d68",
    "sf1-q057@be2ab1032dcd141e5a72063e5bff95dadfac8d623b975893b2ae53f4853be4cd",
    "sf1-q063@897e5a5caf300c61bb44ad032a9c9a74139f304dc4f5d672ca9363a8b6436dae",
    "sf1-q165@12a8a42a3fe3226b71b84242cc81f0d38622078535e72d1e3fcf2c2d2f5b6341",
    "sf1-q175@d8e50de8a2bab019a13d8e687722972fe80ac15fb589c95862de88de914452d6",
    "sf1-q010@f2fe5f8aa9dafcd454a1befd94ec2a85e3f2db28ee2b6c8cfc4ffe7aca1b0b3b",
    "sf1-q012@65f3c3b8dd3eb53b3aab100c3097ef3d1be0c5b899adf6527a7e50ebd8878bae",
    "sf1-q120@2a0bbcfc97dc2c47492b29c8c692a82505be0e930b6c9437dfccad2a49b072d6",
    "sf1-q126@f26452c0d2392b017290f29f66803f42e82341a2e7b48ec929da56c95ba61699",
    "sf1-q128@6b8b46d7d9085e9629216e521cbae739cfc3a1c4f1e4155161ebc3f6746f28c0",
    "sf1-q132@df615b66c98b4888b28f3184083f7970460682a4069ea22d139a16212bc6d9a7",
    "sf1-q134@081e29d2d210d7c4ce1ebe21244c799bce2593e06376a4f48d7a2c8ec40c075b",
    "sf1-q236@74ea9e46f1376817eb46db3e70f6a318b05f0be29744817b74536fc96c6c7195",
    "sf1-q251@305bb89c7f75003082b687b24a4219e874430f5d86aa7eda9377eb23717f5d0b",
    "sf1-q016@74a3ae809cb233c60c18224a032f9466601f721390e965cd4fa3f0962e066e36",
    "sf1-q018@93a13782804e8f815d07fa8207b46fe6c58469f21fad8fe5c61aa3f34cd5477a",
    "sf1-q020@7b9280735ea6ccb67a028c4df4102ea0015f5f94cee950b99ffffcd806a22c24",
    "sf1-q022@57e9e3cfc247d02b7431ff1c0aa1418161c281fcd685e9f3d2d5cc41db359a98",
    "sf1-q026@0544326ca28408fd7905da829b171f2a5a60d78359fd1fa0f7647eddd7380bb8",
    "sf1-q030@9ed6a34837ae794768dbe993294e41d39dc0bbd4ac5a5879a05845ec8c2d0a24",
    "sf1-q036@e32018ee88aac12663e1f2d8b09bab8f2e2e31ff494a15f6083a0dc84dac43a3",
    "sf1-q038@b8dc24690218d3c744e496e29ee7b8a81374691d9310eacac4a504cbc30fbecf",
    "sf1-q178@852d12628358c2eb9fd59c28a3939c780fa9b6b7269a2469062ca1a879c85238",
    "sf1-q017@1c13d2b13d0fe8a6bf50604a9877bdec4745ea05c8f3f1483846b0b8c7d3e8af",
    "sf1-q019@a90819344c0cdaf52db3d6ac91674a5614468a49a6a692bd1001ed17974279c5",
    "sf1-q023@4a10dad83f0392bd748c62d199b3868cebef4d2e578b2e6395e07866c077ee24",
    "sf1-q027@71140ce92a47b98f742e435d49fe7ad8bfcda2f9ae5b85e5714ed9acf5ded4d1",
    "sf1-q035@9be813e481077e83116b600a3f09612596ed27e0733df195df5f15d40aea649c",
    "sf1-q039@cd274e8fc0f9459058c706e983f33ff0be6859d0c853d8a26aea464c2dc95be0",
    "sf1-q131@c4c6bc42d06d36900031dc33201df5393c4dfd26597281629e563cb5897f3c10",
    "sf1-q133@7c58ab57a8abffcc9c99a0041da74629da3d3daa586433d6856b2e3661bd1fdf",
    "sf1-q137@9de5fcd43ed290fab9754e9e456a82c0df329d0ea37c634e93b0b5bb63c46181",
    "sf1-q237@2f4bad992fe039498811e83d451fb6d03073024006bd9deb3ef6ce8fbdb5b974",
    "sf1-q040@533ecd372507741800bcd573eb3ea65859990da8b7cb905a1f12cf583520b1d7",
    "sf1-q042@13f24c0fa7b527d4172a2282ecbb9feee13771242ed3ae5df0d2cd57fd16d435",
    "sf1-q044@8fc32ec13d311d2a02060fed9d10b230e78aff979d043dd4bbc5aa213aa62a7f",
    "sf1-q046@d13001286c004bda7fb05cab2124f2016463af266e0d553fd0f31716bc927acf",
    "sf1-q056@8121ad0f517aec181e0d29cd353da820c44eddb01460545d20125d00b163e631",
    "sf1-q064@3ad994e40a943b741a314c2da792698442b120fad14825994764e23f787919dd",
    "sf1-q068@647092aeeb4cbb1168421a08eaee4bbf3a1709e7792af13e3066441a008ef64a",
    "sf1-q191@abf2387d2390e6585d89e19695840e17dcdba74e54cf2fbfe8a56ab7a0b85fce",
    "sf1-q195@7653a6f61679b2b1b6b9589096a05f4b772cf96f4b7c83ba0e3ddc096c3481fd",
    "sf1-q245@1e066151149ec4a6587c27c3af2159c6fccf4a78fc4bb5108c2370cce437f37d",
    "sf1-q142@3552addbb82d281d12afb1447fcf77eaeca765685a98de405f9a010c4fb4f699",
    "sf1-q146@5b5a2913f50aeb3b4c91f8462a751d7998e8a6f15bccff005d1556c50b311ca4",
    "sf1-q148@29ad0478d4799db34fabde005585446331aff8b120e21108e94bcf39699effcd",
    "sf1-q162@3aaf98320fb70eb9023d979a05f5aa64cd6f41fd74f08770ac5c4dd3e29eaee8",
    "sf1-q168@921c4fe835ee5ebf1732bdede046f14cb3e19af6f3484ec706468674aa08b629",
    "sf1-q243@7b78ddc4eb3c308cffccf7cc6b55e03410e1277cfab31176812bd59cefd655ce"
  ],
  "provisionalHard80Keys": [
    "h80-q034@15457370f54417d7d28316d775e68932f8ffc0aa1b74263656908b024ce0331a"
  ]
});
