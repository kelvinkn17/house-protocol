import { expect } from "chai";
import { ethers } from "hardhat";

describe("HelloWorld", function () {
  it("should deploy with initial message", async function () {
    const HelloWorld = await ethers.getContractFactory("HelloWorld");
    const helloWorld = await HelloWorld.deploy("gm");

    expect(await helloWorld.message()).to.equal("gm");
  });

  it("should update message", async function () {
    const HelloWorld = await ethers.getContractFactory("HelloWorld");
    const helloWorld = await HelloWorld.deploy("gm");

    await helloWorld.setMessage("gn");
    expect(await helloWorld.message()).to.equal("gn");
  });

  it("should emit event on message change", async function () {
    const HelloWorld = await ethers.getContractFactory("HelloWorld");
    const helloWorld = await HelloWorld.deploy("gm");

    await expect(helloWorld.setMessage("gn"))
      .to.emit(helloWorld, "MessageChanged")
      .withArgs("gm", "gn");
  });
});
