const public_id = (url) => {
  // const url = "http://res.cloudinary.com/dgrm75hbj/video/upload/v1714748726/jjqj5ut1boeh7ysgjn1g.mp4"
  // const thumbnail = "http://res.cloudinary.com/dgrm75hbj/image/upload/v1714748734/bm1qet0bgarrcsgjevxy.jpg"
  console.log(url);
  if (url.includes("video")) {
    let public_id = url.replace(
      "http://res.cloudinary.com/dgrm75hbj/video/upload/",
      ""
    );
    public_id = public_id.split("/");
    public_id[1] = public_id[1].replace(".mp4", "");
    console.log(public_id[1]);
    return public_id[1];
  }
  else{
    let public_id = url.replace("http://res.cloudinary.com/dgrm75hbj/image/upload/","");
    public_id = public_id.split("/");
    public_id[1] = public_id[1].replace(".jpg","");
    console.log(public_id[1]);
    return public_id[1]
  }
};

export { public_id };
