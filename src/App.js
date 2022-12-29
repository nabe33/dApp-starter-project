import React, { useEffect, useState } from "react";
import './App.css';
// ethers変数を使えるようにする
import { ethers } from "ethers";
// ABIファイルを含むWavePortal.jsonをインポート
import abi from "./utils/WavePortal.json";

const App = () => {
  // ユーザのパブリックウォレットを保存するために使用する状態変数を定義
  const [currentAccount, setCurrentAccount] = useState("");
  // ユーザのメッセージを保存するために使用する状態変数を定義
  const [messageValue, setMessageValue] = useState();
  // すべてのwavesを保存する状態変数を定義
  const [allWaves, setAllWaves] = useState([]);
  console.log("currentAccount: ", currentAccount);
  // デプロイされたコントラクト(WavePortal)のアドレスを保持する変数
  const contractAddress = "0xb1697ad14Fa3C34BC1013f7aA16Bd7A4969B72c4";
  console.log("currentAccount: ", currentAccount);
  // コントラクトからすべてのwavesを取得するメソッドを作成
  // ABIの内容を参照する変数
  const contractABI = abi.abi;
 
  const getAllWaves = async () => {
    const { ethereum } = window;

    try {
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);  // provider(MetaMask)取得
        const signer = provider.getSigner(); // ユーザのウォレットアドレス取得
        const wavePortalContract = new ethers.Contract(  // コントラクトに接続
          contractAddress,
          contractABI,
          signer
        );
        // コンストラクタからgetAllWavesメソッドを呼び出す
        const waves = await wavePortalContract.getAllWaves();
        // UIに必要なのはアドレス，タイムスタンプ，メッセージだけ
        const wavesCleaned = waves.map((wave) => {
          return {
            address: wave.waver,
            timestamp: new Date(wave.timestamp * 1000),
            message: wave.message,
          };
        });

        // React Stateにデータを格納
        setAllWaves(wavesCleaned);
      } else {
        console.log("Ethereum object doesn't exist!");
      } 
    } catch (error) {
      console.log(error);
    }
  };

  // emitされたイベントに反応
  useEffect(() => {
    let wavePortalContract;
    // コンストラクタ側でNewWaveイベントがemitされたとき，情報を取得
    const onNewWave = (from, timestamp, message) => {
      console.log("NewWave", from, timestamp, message);
      setAllWaves((prevState) => [
        ...prevState,
        {
          address: from,
          timestamp: new Date(timestamp * 1000),
          message: message,
        },
      ]);
    };

    // NewWaveイベントがコントラクトから発信されたときに情報を受け取る
    if (window.ethereum) {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      wavePortalContract = new ethers.Contract(
        contractAddress,
        contractABI,
        signer
      );
      wavePortalContract.on("NewWave", onNewWave);
    }
      // メモリリークを防ぐためにNewWaveのイベントを解除
      return () => {
        if (wavePortalContract) {
          wavePortalContract.off("NewWave", onNewWave);
        }
      };
    }, []);


  // window.ethreumにアクセスできることを確認する関数
  const checkIfwalletIsConnected = async () => {
    try {
      const { ethereum } = window;
      if(!ethereum) {
        console.log("Make sure you have MetaMask!");
      } else {
        console.log("We have the ethereum object", ethereum);
      }
      // ユーザのウォレットへのアクセスが許可されているかを確認
      const accounts = await ethereum.request({ method: "eth_accounts" });
      if ( accounts.length !==0) {
        const account = accounts[0];
        console.log("Found an authorized account:", account);
        setCurrentAccount(account);
        getAllWaves();
      } else {
        console.log("No authorized account found");
      } 
    } catch (error) {
        console.log(error);
    }
  };    
  // connectWalletメソッドを実装
  const connectWallet = async () => {
    try {
      // ユーザが認証可能なウォレットを持っているか確認
      const { ethereum } = window;
      if(!ethereum) {
        alert("Get MetaMAsk!");
        return;
      }
      // 持っていれば，ユーザに対してウォレットのアクセス許可を求める．許可されれば，ユーザの最初のアドレスを currentAccount に格納
      const accounts = await ethereum.request({
        method: "eth_requestAccounts",
      });
      console.log("Connected: ", accounts[0]);
      setCurrentAccount(accounts[0]);
    } catch (error) {
      console.log(error);
    }
  };
  // waveの回数をカウントする関数を実装
  const wave = async () => {
    try {
      // ユーザがMetaMaskを持っているか確認
      const { ethereum } = window;
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum); // MetaMask
        const signer = provider.getSigner(); // ユーザのウォレットアドレスの抽象化
        const wavePortalContract = new ethers.Contract(  // コントラクトに接続
          contractAddress,
          contractABI,
          signer
        );
        let count = await wavePortalContract.getTotalWaves();
        console.log("Retrieved tolal wave count...", count.toNumber());
        console.log("Signer: ", signer);
        // コントラクトの現在の資金額
        let contractBalance = await provider.getBalance(wavePortalContract.address);
        console.log("Contract balance:", ethers.utils.formatEther(contractBalance));
        // コントラクトにwaveを書き込む
        const waveTxn = await wavePortalContract.wave(messageValue, {
          gasLimit: 300000,
        });
        console.log("Mining...", waveTxn.hash);
        await waveTxn.wait();
        console.log("Mined -- ", waveTxn.hash);
        count = await wavePortalContract.getTotalWaves();
        console.log("Retrieved total wave count...", count.toNumber());
        //
        let contractBalance_post = await provider.getBalance(
          wavePortalContract.address
        );
        // コントラクトの残高が残っていることを確認
        if (contractBalance_post.lt(contractBalance)) {
          console.log("User won ETH!");
        } else {
          console.log("User didn't win ETH.");
        }
        console.log(
          "Contract balance after wave:",
          ethers.utils.formatEther(contractBalance_post)
          );
      } else {
        console.log("Ethreum object doesn't exist!");
      }
    } catch (error) {
      console.log(error);
    }
  };
  // Webページがロードされたときに下記関数を実行
  useEffect(() => {
    checkIfwalletIsConnected();
  }, []);

  return (
    <div className="mainContainer">
      <div className="dataContainer">
        <div className="header">
          <span role="img" aria-label="hand-wave">
            👋
          </span>{" "}
          WELCOME!
        </div>
        <div className="bio">
          イーサリアムウォレットに接続してメッセージを作成したら，
          <span role="img" aria-role="hand-wave">
            👋
          </span>
          を送ってください
          <span role="img" arie-role="shine">
            ✨
          </span>
        </div>
        <br />
        {/* ウォレットコネクトのボタンを実装 */}
        {!currentAccount && (
          <button className = "waveButton" onClick={connectWallet}>
            ConnectWallet
          </button>
        )}
        {currentAccount && (
          <button className = "waveButton">Wallet Connected</button>
        )}
        {/* waveボタンにwave関数を連動 */}
        {currentAccount && (
          <button className = "waveButton" onClick={wave}>
            Wave at Me
          </button>
        )}
        {/* メッセージボックスを実装 */}
        {currentAccount && (
          <textarea
           name="messageArea"
           placeholder="メッセージはこちら"
           type="text"
           id="message"
           value={messageValue}
           onChange={(e) => setMessageValue(e.target.value)}
          />
        )}
        {/* 履歴を表示 */}
        {currentAccount &&
          allWaves
            .slice(0)
            .reverse()
            .map((wave, index) => {
              return (
                <div 
                  key={index}
                  style={{
                    backgroundColor: "#F8F8FF",
                    marginTop: "16px",
                    padding: "8px",
                  }}
                >
                  <div>Address: {wave.address}</div>
                  <div>Time: {wave.timestamp.toString()}</div>
                  <div>Message: {wave.message}</div>
                </div>
              );
            })} 
      </div>
    </div>
  );
};

export default App;
