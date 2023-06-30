import React, { useState, useRef, useEffect } from "react";
import './index.css';
import { useNavigate } from "react-router-dom";
import { Link } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import { QrReader } from "react-qr-reader";
import Webcam from 'react-webcam';
import parse from 'html-react-parser'
import Camera from 'react-html5-camera-photo';
import QrCodeReader from 'qrcode-reader';

let reload_needed = 0;

export function LoginPage() {
    const [username, setUsername] = useState('');
    const [error, setErrorname] = useState('');
    const [password, setPassword] = useState('');
    const [sharedValue, setSharedValue] = useState("initial value");
    const navigate = useNavigate();

    useEffect(() => {
        if (reload_needed == 1) {
            window.location.reload();
        }
        if (document.cookie != '') {
            navigate('/home');
        }
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();

        fetch('http://django-env.eba-pzvg7wii.us-east-1.elasticbeanstalk.com/pharmacy/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                password: password
            })
        }).then(response => response.json())
            .then(data => {
                const token = data.token;
                if (typeof token == 'undefined') {
                    const error = data.error;
                    setErrorname(error);
                    setTimeout(function () {
                        setErrorname("");
                    }, 1000);
                } else {
                    const now = new Date();
                    const expirationDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
                    document.cookie = "auth_token=" + token + "; path=/; Expires=" + expirationDate.toUTCString() + ";";
                    navigate('/home');
                }
            })
            .catch(error => {
                console.error('Error:', error);
            });
    };

    return (
        <div className="login-container">
            <form onSubmit={handleSubmit} className="login-form">
                <h2>Login</h2>
                <label>Username</label>
                <input
                    type="username"
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)} required
                />
                <label>Password</label>
                <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)} required
                />
                <button type="submit">Login</button>
                <p className="error-message">{error}</p>
            </form>
        </div>
    );
}

export function HomePage() {
    const navigate = useNavigate();
    let auth_token;
    useEffect(() => {
        if (reload_needed == 1) {
            window.location.reload();
        }
        if (document.cookie == '') {
            navigate('/');
        } else {
            auth_token = document.cookie.split('; ').find(row => row.startsWith('auth_token=')).split('=')[1];
        }
    }, []);

    return (
        <div className="qrcode">
            <nav className="nav">
                <h2>
                    Pharmacy App
                </h2>
                <ul>
                    <li><Link to="/logout"> Logout</Link></li>
                </ul>
            </nav>
            <div className="home-container">
                <button>
                    <Link to="/qr"> QR code</Link>
                </button>
                <button>
                    <Link to="/delivery"> Delivery Control</Link>
                </button>
            </div>
        </div>
    );
}


export function Prescription() {
    const navigate = useNavigate();
    const { prescriptionId } = useParams();
    let auth_token;
    const [options, updateOptions] = useState();
    const [alternatives, updateAlternatives] = useState();
    const [obtained, updateObtained] = useState([]);
    const [selected, updateSelected] = useState([]);
    const [price, updatePrice] = useState(0);
    const [imageSrc, setImageSrc] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState(0);
    const [error, setError] = useState("");
    const [processing, setprocessing] = useState(0);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (reload_needed == 1) {
            window.location.reload();
        }
        if (document.cookie == '') {
            navigate('/');
        } else {
            auth_token = document.cookie.split('; ').find(row => row.startsWith('auth_token=')).split('=')[1];
        }
        fetch('http://django-env.eba-pzvg7wii.us-east-1.elasticbeanstalk.com/pharmacy/prescription/' + prescriptionId, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + auth_token,
                'Content-Type': 'application/json'
            }
        }).then(response => response.json())
            .then(data => {
                const message = data.message;
                if (typeof message == 'undefined') {
                    const error = data.error;
                    if (error == "Invalid username or password") {
                        document.cookie = "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
                        navigate('/');
                    }
                } else {
                    let i = 1;
                    const obj = JSON.parse(message);
                    let prescription2 = JSON.parse(obj.body);

                    for (let i = 0; i < prescription2.length; i++) {
                        obtained[i] = prescription2[i];
                        selected[i] = 0;
                    }

                    updateOptions(prescription2.map(item => {
                        const nrow = "row" + i;
                        i = i + 1;
                        return <tr key={nrow}>
                            <td><input type="radio" name={nrow} value='1' onChange={handleClick} /></td>
                            <td>{item['name']}</td>
                            <td>{item['price']}</td>
                        </tr>;
                    }))

                    i = 1;
                    updateAlternatives(prescription2.map(item => {
                        const alternative = item['alternatives'];
                        const nrow = "row" + i;
                        i = i + 1;
                        return <tr key={nrow}>
                            <td><input type="radio" name={nrow} value='2' onChange={handleClick} /></td>
                            <td>{alternative[0]['name']}</td>
                            <td>{alternative[0]['price']}</td>
                        </tr>;
                    }))
                }
            })
            .catch(error => {
                console.error('Error:', error);
            });
    }, []);

    const handleClick = (event) => {
        selected[parseInt(event.target.name.split('row')[1]) - 1] = parseInt(event.target.value);
        let temp = 0;
        for (let i = 0; i < obtained.length; i++) {
            if (selected[i] == '1') {
                temp = temp + obtained[i]['price'];
            }
            if (selected[i] == '2') {
                const alternative = obtained[i]['alternatives'];
                temp = temp + alternative[0]['price'];
            }
        }
        updatePrice(temp);
    };

    const capture = () => {
        const imageSrc = webcamRef.current.getScreenshot();
        console.log(imageSrc);
        setImageSrc(imageSrc);
    };

    const retry = () => {
        setImageSrc(null);
        fileInputRef.current.value = '';
    };

    const handleImageUpload = (event) => {
        const file = event.target.files[0];
        const reader = new FileReader();

        reader.onload = function (event) {
            const base64Data = event.target.result;
            setImageSrc(base64Data);
        };

        reader.readAsDataURL(file);
        console.log(file);
    }

    function showError(message) {
        setError(message);
        setTimeout(function () {
            setError("");
        }, 1000);
    }

    const submit = () => {
        setprocessing(1);
        if (paymentMethod == 0) {
            showError("Payment Method not selected");
            setprocessing(0);
            return;
        }

        let jsonArr = [];
        for (let i = 0; i < selected.length; i++) {
            if (selected[i] == '0') {
                showError("Missing prescription decisions");
                setprocessing(0);
                return;
            }
            if (selected[i] == '1') {
                jsonArr.push({
                    name: obtained[i]['name'],
                    price: obtained[i]['price']
                });
            }
            if (selected[i] == '2') {
                const alternative = obtained[i]['alternatives'];
                jsonArr.push({
                    name: alternative[0]['name'],
                    price: alternative[0]['price']
                });
            }
        }
        auth_token = document.cookie.split('; ').find(row => row.startsWith('auth_token=')).split('=')[1];
        fetch('http://django-env.eba-pzvg7wii.us-east-1.elasticbeanstalk.com/pharmacy/prescription/payment/' + prescriptionId, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + auth_token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                item: jsonArr,
                payment: paymentMethod,
                image: imageSrc,
                price: price
            })
        }).then(response => response.json())
            .then(data => {
                if (data.message == "Sucess") {
                    navigate('/');
                }
                else {
                    showError("Payment method failed");
                }
                setprocessing(0);
            });
    };

    const webcamRef = React.useRef(null);

    return (
        <div className="qrcode">
            <nav className="nav">
                <h2>
                    Pharmacy App
                </h2>
                <ul>
                    <li><Link to="/home"> Home</Link></li>
                    <li><Link to="/logout"> Logout</Link></li>
                </ul>
            </nav>
            <div className="prescription" >
                <div className="second-element">
                    <div className="prescription-container">
                        <table>
                            <caption>Prescription</caption>
                            <thead>
                                <tr>
                                    <th></th>
                                    <th>Name</th>
                                    <th>Price</th>
                                </tr>
                            </thead>
                            <tbody>
                                {options}
                            </tbody>
                        </table>
                        <table>
                            <caption>Alternative</caption>
                            <thead>
                                <tr>
                                    <th></th>
                                    <th>Name</th>
                                    <th>Price</th>
                                </tr>
                            </thead>
                            <tbody>
                                {alternatives}
                            </tbody>
                        </table>
                    </div>
                    <div>
                        <h2>Price: {price}</h2>
                    </div>
                </div>
                <div className="second-element">
                    <div className="payment-container">
                        <button value={1} onClick={e => setPaymentMethod(1)} className={paymentMethod == 1 ? "selected_button" : ""}>
                            Credit card
                        </button>
                        <button value={2} onClick={e => setPaymentMethod(2)} className={paymentMethod == 2 ? "selected_button" : ""}>
                            Money
                        </button>
                        <button value={3} onClick={e => setPaymentMethod(3)} className={paymentMethod == 3 ? "selected_button" : ""}>
                            Facial Recognition
                        </button>
                    </div>
                    {paymentMethod == 3 && (
                        < div className="payment-container" style={{ width: '500px', height: '500px' }}>
                            {imageSrc ? (
                                <img src={imageSrc} />
                            ) : (<Webcam audio={false} ref={webcamRef} />)}
                        </div>)}
                    {paymentMethod == 3 && (
                        < div style={{ paddingBottom: '30px' }}><input
                            type="file"
                            name="myImage"
                            ref={fileInputRef}
                            onChange={handleImageUpload} /></div>
                    )}
                    {paymentMethod == 3 && (
                        <div className="payment-container">
                            {imageSrc ? (
                                <button onClick={retry}>Retry photo</button>
                            ) : (<button onClick={capture}>Capture photo</button>)}
                            {processing ? (<div style={{ paddingLeft: '60px' }}><div className="loading-circle" ></div></div>) : (<button onClick={submit}>Submit</button>)}
                        </div>
                    )}
                    {paymentMethod != 3 && (<div className="payment-container">{processing ? (<div className="loading-circle"></div>) : (<button onClick={submit}>Submit</button>)}</div>)}
                    <p className="error-message">{error}</p>
                </div>
            </div>
        </div >
    );
}

export function Delivery() {
    const navigate = useNavigate();
    const [options, updateOptions] = useState();
    let auth_token;
    let prescription2;
    useEffect(() => {
        if (document.cookie == '') {
            navigate('/');
        } else {
            auth_token = document.cookie.split('; ').find(row => row.startsWith('auth_token=')).split('=')[1];
        }
    }, []);

    useEffect(() => {
        if (document.cookie == '') {
            navigate('/');
        } else {
            auth_token = document.cookie.split('; ').find(row => row.startsWith('auth_token=')).split('=')[1];
        }
        fetch('http://django-env.eba-pzvg7wii.us-east-1.elasticbeanstalk.com/pharmacy/orders', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + auth_token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
            })
        }).then(response => response.json())
            .then(data => {
                const message = data.message;
                if (typeof message == 'undefined') {
                    const error = data.error;
                    if (error == "Invalid username or password") {
                        document.cookie = "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
                        navigate('/');
                    }
                } else {
                    let i = 1;
                    prescription2 = JSON.parse(message['orderList']);
                    if (Object.keys(prescription2).length === 0) {
                        updateOptions([]);
                    }
                    else {
                        prescription2.sort((a, b) => a.orderId - b.orderId);
                        updateOptions(prescription2.map(item => {

                            let items = "";
                            for (let i = 1; i < item['orderItems'].length; i++) {
                                items += `<tr><td>${item['orderItems'][i]['name']}</td> <td>${item['orderItems'][i]['price']}</td></tr>`;
                            }
                            return <><tr>
                                <td rowSpan={item['orderItems'].length}>{item['orderId']}</td >
                                <td>{item['orderItems'][0]['name']}</td> <td>{item['orderItems'][0]['price']}</td>
                                <td rowSpan={item['orderItems'].length}>{item['orderStatus']}</td >
                                {item['orderStatus'] == 'delivering' ? (<td rowSpan={item['orderItems'].length}><button value={item['orderId']} onClick={confirm}>Confirm delivery</button></td>) : (<td rowSpan={item['orderItems'].length}></td>)}
                            </tr >
                                {parse(items)}
                            </>;
                        }))
                    }
                }
            });
        const timerId = setInterval(() => {
            fetch('http://django-env.eba-pzvg7wii.us-east-1.elasticbeanstalk.com/pharmacy/orders', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + auth_token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                })
            }).then(response => response.json())
                .then(data => {
                    const message = data.message;
                    if (typeof message == 'undefined') {
                        const error = data.error;
                        if (error == "Invalid username or password") {
                            document.cookie = "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
                            navigate('/');
                        }
                    } else {
                        let i = 1;
                        prescription2 = JSON.parse(message['orderList']);
                        if (Object.keys(prescription2).length === 0) {
                            updateOptions([]);
                        }
                        else {
                            prescription2.sort((a, b) => a.orderId - b.orderId);
                            updateOptions(prescription2.map(item => {

                                let items = "";
                                for (let i = 1; i < item['orderItems'].length; i++) {
                                    items += `<tr><td>${item['orderItems'][i]['name']}</td> <td>${item['orderItems'][i]['price']}</td></tr>`;
                                }
                                return <><tr>
                                    <td rowSpan={item['orderItems'].length}>{item['orderId']}</td >
                                    <td>{item['orderItems'][0]['name']}</td> <td>{item['orderItems'][0]['price']}</td>
                                    <td rowSpan={item['orderItems'].length}>{item['orderStatus']}</td >
                                    {item['orderStatus'] == 'delivering' ? (<td rowSpan={item['orderItems'].length}><button value={item['orderId']} onClick={confirm}>Confirm delivery</button></td>) : (<td rowSpan={item['orderItems'].length}></td>)}
                                </tr >
                                    {parse(items)}
                                </>;
                            }))
                        }
                    }
                });
        }, 1000)
        return () => {
            clearInterval(timerId);
        }
    }, []);

    const confirm = (e) => {
        fetch('http://django-env.eba-pzvg7wii.us-east-1.elasticbeanstalk.com/pharmacy/confirmOrder/' + e.target.value, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + auth_token,
                'Content-Type': 'application/json'
            }
        }).then(response => response.json())
            .then(data => {
                const message = data.message;
                if (typeof message == 'undefined') {
                    const error = data.error;
                    if (error == "Invalid username or password") {
                        document.cookie = "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
                        navigate('/');
                    }
                }
            });
    };


    return (
        <div className="qrcode">
            <nav className="nav">
                <h2>
                    Pharmacy App
                </h2>
                <ul>
                    <li><Link to="/home"> Home</Link></li>
                    <li><Link to="/logout"> Logout</Link></li>
                </ul>
            </nav>
            <div className="delivery-container">
                <table>
                    <caption>Order status</caption>
                    <thead>
                        <tr>
                            <th rowSpan="2">Order Id</th>
                            <th colspan="2">Items</th>
                            <th rowSpan="2">Status</th>
                            <th rowSpan="2">Confirm</th>
                        </tr>
                        <tr>
                            <th>Name</th>
                            <th>Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        {options}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export function LogOut() {
    const navigate = useNavigate();
    let auth_token;
    useEffect(() => {
        if (document.cookie == '') {
            navigate('/');
        } else {
            document.cookie = "auth_token=; path=/;expires=Thu, 01 Jan 1970 00:00:00 UTC;";
            navigate('/');
        }
    }, []);

    return (
        <div>
            <h1>Welcome to the Home Page!</h1>
            <p>This is the home page of my website.</p>
            <div>
                <button>
                    <Link to="/about"> About Us</Link>
                </button>
            </div>
        </div>
    );
}

export function Qr() {
    const navigate = useNavigate();
    const [selectedImage, setSelectedImage] = useState(null);
    const [qrCodeData, setQrCodeData] = useState(null);
    useEffect(() => {
        reload_needed = 1;
    }, []);

    const handleScan = async (scanData) => {
        if (typeof scanData != 'undefined') {
            let message = scanData.text;
            message = message.split('prescription/')[1];
            reload_needed = 1;
            navigate('/prescription/' + message);
        }
    };

    const handleImageUpload = (event) => {
        const file = event.target.files[0];
        const reader = new FileReader();

        reader.onload = () => {
            const imageData = reader.result;
            setQrCodeData(null);
            decodeQRCode(imageData);
        };

        reader.readAsDataURL(file);
    };

    const decodeQRCode = (imageData) => {
        const qr = new QrCodeReader();

        qr.callback = (error, result) => {
            if (error) {
                console.error(error);
                return;
            }

            if (result && result.result) {
                setQrCodeData(result.result);
                let message = result.result.split('prescription/')[1];
                reload_needed = 1;
                navigate('/prescription/' + message);
            } else {
                console.log('No QR code found');
            }
        };

        const image = new Image();
        image.src = imageData;

        image.onload = () => {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = image.width;
            canvas.height = image.height;
            context.drawImage(image, 0, 0, image.width, image.height);

            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            qr.decode(imageData);
        };
    };


    return (
        <div className="qrcode">
            <nav className="nav">
                <h2>
                    Pharmacy App
                </h2>
                <ul>
                    <li><Link to="/home"> Home</Link></li>
                    <li><Link to="/logout"> Logout</Link></li>
                </ul>
            </nav>
            <div style={{
                width: '40%', height: '40%', margin: '-50px auto -50px auto'
            }}>
                <QrReader
                    delay={1000}
                    onResult={handleScan}
                />
                <input
                    type="file"
                    name="myImage"
                    onChange={handleImageUpload} />
            </div>
        </div >
    );

}
