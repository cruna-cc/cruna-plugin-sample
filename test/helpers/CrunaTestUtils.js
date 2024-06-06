const hre = require("hardhat");
const { domainType } = require("./eip712");
const BN = require("bn.js");
const ethers = hre.ethers;
const ethSigUtil = require("eth-sig-util");
const deployUtils = new (require("eth-deploy-utils"))();
const canonicalBytecodes = require("@cruna/protocol/canonicalBytecodes.json");
const erc7656Bytecode = require("erc7656/bytecode.json");

let count = 1;

const CrunaTestUtils = {
  bytes4(bytes32value) {
    return ethers.utils.hexDataSlice(bytes32value, 0, 4);
  },

  async getChainId() {
    const chainId = (await hre.ethers.provider.getNetwork()).chainId;
    return new BN(chainId, 10);
  },

  async getTimestamp() {
    return (await ethers.provider.getBlock()).timestamp;
  },

  addr0: "0x" + "0".repeat(40),

  async increaseBlockTimestampBy(offset) {
    await ethers.provider.send("evm_increaseTime", [offset]);
    await ethers.provider.send("evm_mine");
  },

  amount(str) {
    return ethers.utils.parseEther(str);
  },

  normalize(amount, decimals = 18) {
    return amount + "0".repeat(decimals);
  },

  keccak256(str) {
    const bytes = ethers.utils.toUtf8Bytes(str);
    return ethers.utils.keccak256(bytes);
  },

  cl(...args) {
    console.log("\n >>>", count++, ...args, "\n");
  },

  async deployCanonical(deployer) {
    await deployUtils.deployNickSFactory(deployer);
    const erc6551Registry = await deployUtils.deployBytecodeViaNickSFactory(
      deployer,
      "ERC6551Registry",
      canonicalBytecodes.ERC6551Registry.bytecode,
      canonicalBytecodes.ERC6551Registry.salt,
    );
    const crunaRegistry = await deployUtils.deployBytecodeViaNickSFactory(
      deployer,
      "ERC7656Registry",
      erc7656Bytecode.bytecode,
      erc7656Bytecode.salt,
    );
    const crunaGuardian = await deployUtils.deployBytecodeViaNickSFactory(
      deployer,
      "CrunaGuardian",
      canonicalBytecodes.CrunaGuardian.bytecode,
      canonicalBytecodes.CrunaGuardian.salt,
    );
    return [erc6551Registry, crunaRegistry, crunaGuardian];
  },

  async deployManager(deployer) {
    const managerImpl = await deployUtils.deploy("CrunaManager");
    return deployUtils.deploy("CrunaManagerProxy", managerImpl.address);
  },

  async makeSignature(chainId, verifyingContract, privateKey, primaryType, types, message) {
    const domain = {
      name: "Cruna",
      version: "1",
      chainId,
      verifyingContract,
    };
    const data = {
      types: {
        EIP712Domain: domainType(domain),
      },
      domain,
      primaryType,
      message,
    };
    data.types[primaryType] = types;
    return ethSigUtil.signTypedMessage(Buffer.from(privateKey.slice(2), "hex"), { data });
  },

  combineTimestampAndValidFor(timestamp, validFor) {
    return ethers.BigNumber.from(timestamp.toString()).mul(1e7).add(validFor);
  },

  async signRequest(
    selector,
    owner,
    actor,
    tokenAddress,
    tokenId,
    extra,
    extra2,
    extra3,
    timestamp,
    validFor,
    chainId,
    signer,
    validatorContract,
  ) {
    timestamp = ethers.BigNumber.from(timestamp.toString()).toNumber();
    const timeValidation = thiz.combineTimestampAndValidFor(timestamp, validFor).toString();

    const message = {
      selector,
      owner,
      actor,
      tokenAddress,
      tokenId: tokenId.toString(),
      extra: extra.toString(),
      extra2: extra2.toString(),
      extra3: extra3.toString(),
      timeValidation,
    };

    return [
      await thiz.makeSignature(
        chainId.toString(),
        validatorContract.address,
        hardhatPrivateKeyByWallet[signer],
        "Auth",
        [
          { name: "selector", type: "bytes4" },
          { name: "owner", type: "address" },
          { name: "actor", type: "address" },
          { name: "tokenAddress", type: "address" },
          { name: "tokenId", type: "uint256" },
          { name: "extra", type: "uint256" },
          { name: "extra2", type: "uint256" },
          { name: "extra3", type: "uint256" },
          { name: "timeValidation", type: "uint256" },
        ],
        message,
      ),
      message,
    ];
  },

  async selectorId(interfaceName, functionName) {
    const artifact = await hre.artifacts.readArtifact(interfaceName);
    const abi = artifact.abi;
    const functions = abi.filter((item) => item.type === "function");
    let selector = "0x00000000";
    functions.forEach((func) => {
      const str = func.name + "(" + func.inputs.map((input) => input.type).join(",") + ")";
      if (func.name === functionName) {
        selector = ethers.utils.id(str).slice(0, 10);
      }
    });
    return selector;
  },

  pluginKey(name, impl, salt) {
    return (
      salt.substring(0, 10) + "0000" + impl.substring(2).toLowerCase() + "0000" + thiz.bytes4(thiz.keccak256(name)).substring(2)
    );
  },
};

const thiz = CrunaTestUtils;

module.exports = CrunaTestUtils;

const hardhatPrivateKeyByWallet = {
  "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266": "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  "0x70997970C51812dc3A010C7d01b50e0d17dc79C8": "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC": "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
  "0x90F79bf6EB2c4f870365E785982E1f101E93b906": "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
  "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65": "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",
  "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc": "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba",
  "0x976EA74026E726554dB657fA54763abd0C3a0aa9": "0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e",
  "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955": "0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356",
  "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f": "0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97",
  "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720": "0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6",
  "0xBcd4042DE499D14e55001CcbB24a551F3b954096": "0xf214f2b2cd398c806f84e317254e0f0b801d0643303237d97a22a48e01628897",
  "0x71bE63f3384f5fb98995898A86B02Fb2426c5788": "0x701b615bbdfb9de65240bc28bd21bbc0d996645a3dd57e7b12bc2bdf6f192c82",
  "0xFABB0ac9d68B0B445fB7357272Ff202C5651694a": "0xa267530f49f8280200edf313ee7af6b827f2a8bce2897751d06a843f644967b1",
  "0x1CBd3b2770909D4e10f157cABC84C7264073C9Ec": "0x47c99abed3324a2707c28affff1267e45918ec8c3f20b8aa892e8b065d2942dd",
  "0xdF3e18d64BC6A983f673Ab319CCaE4f1a57C7097": "0xc526ee95bf44d8fc405a158bb884d9d1238d99f0612e9f33d006bb0789009aaa",
  "0xcd3B766CCDd6AE721141F452C550Ca635964ce71": "0x8166f546bab6da521a8369cab06c5d2b9e46670292d85c875ee9ec20e84ffb61",
  "0x2546BcD3c84621e976D8185a91A922aE77ECEc30": "0xea6c44ac03bff858b476bba40716402b03e41b8e97e276d1baec7c37d42484a0",
  "0xbDA5747bFD65F08deb54cb465eB87D40e51B197E": "0x689af8efa8c651a91ad287602527f3af2fe9f6501a7ac4b061667b5a93e037fd",
  "0xdD2FD4581271e230360230F9337D5c0430Bf44C0": "0xde9be858da4a475276426320d5e9262ecfc3ba460bfac56360bfa6c4c28b4ee0",
  "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199": "0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e",
};
