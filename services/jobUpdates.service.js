
const updateDetails = async (job_id) => {
    try {
      Job.findOne({
        include: [
          {
            model: Vehcle,
            attributes: ["latitude", "longitude", "speed", "vehicle"],
          },
        ],
        where: { id: job_id },
      }).then((dataP) => {
        JobDet.findAndCountAll({
          include: [
            {
              model: Address,
              attributes: ["name", "address", "code", "latitude", "longitude"],
            },
          ],
          where: { job_id: job_id, crossed: false },
          order: [["schedule_arrival", "ASC"]],
        }).then(async (data) => {
          // console.log({ master: dataP.VehicleTracking });
          const vehicleData = dataP.VehicleTracking;
          const veh = { lat: vehicleData.latitude, lng: vehicleData.longitude };
          // console.log("Speed : ", vehicleSpeed);
          let timeDiff = 0;
          let preIndex = null;
          let hopIds = [];
          const hopData = data.rows;
          // hopData.length =1
          console.log(
            "Hop data length =========================== +++++++++++++++++++++ ",
            data.rows.length
          );
          let destData = [];
          // hopData.length =1
          const hopDataLength = hopData.length;
          for (let i = 0; i < hopDataLength; i += 10) {
            let dest = "";
            await Promise.all(
              hopData.slice(i, i + 10).map((e, i) => {
                // console.log("Index : ", e);
                if (!e.ATD) {
                  hopIds.push(e.id);
                  if (i != 0) {
                    dest += "|";
                  }
                  dest += `${e.AddressBook.latitude},${e.AddressBook.longitude}`;
                }
              })
            );
            console.log("dest : ", dest);
            destData.push(dest);
          }
          //  console.log("destData",destData);
          //  console.log("vehicleData",vehicleData.latitude);
          //  console.log("vehicleData",vehicleData.longitude);
          //  console.log("hopData",hopData);
          // return
          // await Promise.all(
          //   hopData.map((e, i) => {
          //     // console.log("Index : ", e);
          //     if (!e.ATD) {
          //       hopIds.push(e.id);
          //       if (i != 0) {
          //         destinationData += "|";
          //       }
          //       destinationData += `${e.AddressBook.latitude},${e.AddressBook.longitude}`;
          //     }
          //   })
          // );
          // console.log("destinationData======== ",destinationData);
          // console.log("vehicleData ============ ",vehicleData.latitude,vehicleData.longitude);
          if (
            (vehicleData.latitude && vehicleData.longitude && hopData,
            hopDataLength)
          ) {
            await getTimeFromGoogle(
              vehicleData,
              hopData,
              destData,
              hopDataLength
            );
          }
        });
      });
      return;
    } catch (error) {
      console.log("Error in ATA ATD update function : ", error);
    }
  };


  const getTimeFromGoogle = async (
  vehicleStatus,
  hopData,
  hopArr,
  hopDataLength
) => {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    // onst origin = "28.419580,77.078370";
    const threshold = 100;
    const origin = `${vehicleStatus.latitude},${vehicleStatus.longitude}`;
    // const destinations = "27.1752554,78.0098161|27.5,78.75|27.5105308,79.0209289";
    let destArr = [];
    // console.log("================",hopArr);
    await Promise.all(
      hopArr.map(async (e) => {
        const apiUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${e}&key=${apiKey}`;
        const { data } = await axios.get(apiUrl);
        console.log(
          "+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++",
          data?.rows[0]?.elements
        );
        const dataArr = data?.rows[0]?.elements;
        destArr = destArr.concat(dataArr);
      })
    );

    console.log("OR : ", origin);

    destArr.map(async (e, i) => {
      if (!e?.duration?.value) {
        console.log(hopDataLength);
        console.log(i, "Duration : ", e);
        return;
      }
      const currentTime = await new Date(
        moment().add(e?.duration?.value, "seconds")
      );
      if (hopDataLength == 1 && e?.duration?.value == 1000) {
        // console.log(hopData[0]);
        return await Job.update(
          { Status: 3, ATA: currentTime, arrived: true },
          { where: { id: hopData[0].job_id } }
        );
      }
      if (e?.distance?.value <= threshold && !hopData[0].arrived) {
        return await JobDet.update(
          { ATA: currentTime, arrived: true },
          { where: { id: hopData[0].id, job_id: hopData[0].job_id } }
        );
      } else if (
        e?.distance?.value <= threshold &&
        !hopData[0].crossed &&
        hopData[0].arrived
      ) {
        return await JobDet.update(
          { ATD: new Date(), crossed: true },
          { where: { id: hopData[0].id, job_id: hopData[0].job_id } }
        );
      } else {
        return await JobDet.update(
          { ATA: currentTime },
          { where: { id: hopData[i].id, job_id: hopData[i].job_id } }
        );
      }
    });
  } catch (error) {
    console.log("Error in getTimeFromGoogle function : ", error);
  }
};
