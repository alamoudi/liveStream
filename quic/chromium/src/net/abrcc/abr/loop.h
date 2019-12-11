#ifndef ABRCC_ABR_LOOP_H__
#define ABRCC_ABR_LOOP_H_

#include "net/abrcc/abr/interface.h"

#include "net/abrcc/service/metrics_service.h"
#include "net/abrcc/service/push_service.h"
#include "net/abrcc/service/store_service.h"

namespace quic {

class AbrLoop {
 public:
  AbrLoop(
    std::unique_ptr<AbrInterface> interface,
    std::shared_ptr<MetricsService> metrics,
    std::shared_ptr<StoreService> store,
    std::shared_ptr<PushService> push);  
  AbrLoop(const AbrLoop&) = delete;
  AbrLoop& operator=(const AbrLoop&) = delete;
  ~AbrLoop();
  
  void Start();

 private:
  std::unique_ptr<AbrInterface> interface;
  
  std::shared_ptr<MetricsService> metrics;
  std::shared_ptr<StoreService> store;
  std::shared_ptr<PushService> push;    
};

}

#endif